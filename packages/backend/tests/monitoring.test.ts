import test from 'node:test';
import assert from 'node:assert/strict';
import {buildApp} from '../src/app';
import {initSchema, openDb} from '../src/db/db';

test('monitoring sessions includes stats snapshot', async () => {
  const dbPath = `/tmp/ssh_monitoring_${Date.now()}.db`;
  const db = openDb(dbPath);
  initSchema(db);

  const runner = {
    async startSandbox() {
      return 'c1';
    },
    async stopSandbox() {},
    async getContainerStatsSnapshot() {
      return {cpuPercent: 10, memoryBytes: 20, memoryLimitBytes: 100, ts: Date.now()};
    }
  } as any;

  const app = buildApp({db, runner, jwtSecret: 'change-me-to-a-long-random-string'});
  await app.ready();

  const reg = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {email: `u_${Date.now()}@example.com`, password: 'password1234'}
  });

  assert.equal(reg.statusCode, 200);
  const regJson = reg.json() as any;
  const token = regJson.token as string;
  const userId = regJson.user.id as string;

  const policyRow = db.prepare('SELECT id FROM policies WHERE created_by = ? ORDER BY created_at ASC LIMIT 1').get(userId) as {id: string};

  db.prepare(
    'INSERT INTO sandboxes (id, status, docker_container_id, image, command_json, policy_id, created_by, created_at, stopped_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run('s1', 'running', 'c1', 'alpine:latest', JSON.stringify(['echo', 'hi']), policyRow.id, userId, Date.now(), null);

  const res = await app.inject({
    method: 'GET',
    url: '/api/monitoring/sessions',
    headers: {authorization: `Bearer ${token}`}
  });

  assert.equal(res.statusCode, 200);
  const json = res.json() as any;
  assert.equal(json.sessions.length, 1);
  assert.equal(json.sessions[0].sandboxId, 's1');
  assert.equal(json.sessions[0].stats.cpuPercent, 10);
  assert.equal(json.sessions[0].stats.memoryBytes, 20);

  await app.close();
});

test('monitoring generates cpu/memory alerts from stats', async () => {
  const dbPath = `/tmp/ssh_monitoring_alerts_${Date.now()}.db`;
  const db = openDb(dbPath);
  initSchema(db);

  const runner = {
    async startSandbox() {
      return 'c1';
    },
    async stopSandbox() {},
    async getContainerStatsSnapshot() {
      return {
        cpuPercent: 95,
        memoryBytes: 95 * 1024 * 1024,
        memoryLimitBytes: 100 * 1024 * 1024,
        ts: Date.now()
      };
    }
  } as any;

  const app = buildApp({db, runner, jwtSecret: 'change-me-to-a-long-random-string'});
  await app.ready();

  const reg = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {email: `u_${Date.now()}@example.com`, password: 'password1234'}
  });

  const regJson = reg.json() as any;
  const token = regJson.token as string;
  const userId = regJson.user.id as string;

  db.prepare('INSERT INTO policies (id, name, rules_json, created_by, created_at) VALUES (?, ?, ?, ?, ?)').run(
    'p_alerts',
    'Alerts Policy',
    JSON.stringify({allowNetwork: false, memoryLimitMb: 100, cpuLimit: 1, readOnlyRootFs: true}),
    userId,
    Date.now()
  );

  db.prepare(
    'INSERT INTO sandboxes (id, status, docker_container_id, image, command_json, policy_id, created_by, created_at, stopped_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run('s_alerts', 'running', 'c1', 'alpine:latest', JSON.stringify(['echo', 'hi']), 'p_alerts', userId, Date.now(), null);

  const sessions = await app.inject({method: 'GET', url: '/api/monitoring/sessions', headers: {authorization: `Bearer ${token}`}});
  assert.equal(sessions.statusCode, 200);

  const alertsRes = await app.inject({method: 'GET', url: '/api/monitoring/alerts', headers: {authorization: `Bearer ${token}`}});
  assert.equal(alertsRes.statusCode, 200);
  const alertsJson = alertsRes.json() as any;
  const messages = (alertsJson.alerts as Array<any>).map((a) => a.message as string);

  assert.ok(messages.some((m) => m.startsWith('memory_high:')));
  assert.ok(messages.some((m) => m.startsWith('cpu_high:')));

  await app.close();
});
