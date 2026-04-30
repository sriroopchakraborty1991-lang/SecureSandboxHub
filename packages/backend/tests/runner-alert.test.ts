import test from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {SandboxRunner} from '../src/sandbox/runner';
import {initSchema, openDb} from '../src/db/db';

test('SandboxRunner emits alert on non-zero exit code', async () => {
  const dbPath = `/tmp/ssh_runner_alert_${Date.now()}.db`;
  const db = openDb(dbPath);
  initSchema(db);

  const runner = new SandboxRunner({db, dockerSocket: '/var/run/docker.sock'});

  (runner as any).docker = {
    modem: {
      demuxStream() {}
    }
  };

  const stream = new PassThrough();
  const fakeContainer = {
    async logs() {
      return stream;
    },
    wait() {
      return Promise.resolve({StatusCode: 7});
    }
  };

  await (runner as any).attachLogs('s1', fakeContainer);
  await new Promise<void>((resolve) => setTimeout(() => resolve(), 0));

  const row = db
    .prepare("SELECT message FROM sandbox_events WHERE sandbox_id = ? AND type = 'alert' ORDER BY ts DESC LIMIT 1")
    .get('s1') as {message: string} | undefined;

  assert.ok(row);
  assert.equal(row!.message, 'nonzero_exit_code:7');
});

