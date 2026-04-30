import {env} from './config/env';
import {openDb, initSchema} from './db/db';
import {SandboxRunner} from './sandbox/runner';
import {buildApp} from './app';

async function main() {
  const db = openDb(env.databasePath);
  initSchema(db);

  const runner = new SandboxRunner({db, dockerSocket: env.dockerSocket});
  const app = buildApp({db, runner, jwtSecret: env.jwtSecret});

  await app.listen({host: '0.0.0.0', port: env.port});
}

main().catch((err) => {
  process.stderr.write(`${String(err?.stack ?? err)}\n`);
  process.exit(1);
});

