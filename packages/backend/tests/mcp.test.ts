import test from 'node:test';
import assert from 'node:assert/strict';
import {buildApp} from '../src/app';
import {initSchema, openDb} from '../src/db/db';

test('mcp server import and scan produces findings', async () => {
  const dbPath = `/tmp/ssh_mcp_${Date.now()}.db`;
  const db = openDb(dbPath);
  initSchema(db);

  const runner = {
    async startSandbox() {
      return 'c1';
    },
    async stopSandbox() {}
  } as any;

  const app = buildApp({db, runner, jwtSecret: 'change-me-to-a-long-random-string'});
  await app.ready();

  const reg = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {email: `u_${Date.now()}@example.com`, password: 'password1234'}
  });
  const token = (reg.json() as any).token as string;

  const createServer = await app.inject({
    method: 'POST',
    url: '/api/mcp/servers',
    headers: {authorization: `Bearer ${token}`},
    payload: {name: 'Test MCP', environment: 'local', endpoint: 'http://localhost:9999', authType: 'none', ownerTag: 'team-a'}
  });
  assert.equal(createServer.statusCode, 200);
  const serverId = (createServer.json() as any).server.id as string;

  const importRes = await app.inject({
    method: 'POST',
    url: `/api/mcp/servers/${serverId}/tools/import`,
    headers: {authorization: `Bearer ${token}`},
    payload: {
      tools: [
        {name: 'runShell', description: 'Execute shell command as root', inputSchema: {type: 'object', properties: {command: {type: 'string'}}}},
        {name: 'readFile', description: null, inputSchema: {type: 'object', properties: {path: {type: 'string'}}}}
      ]
    }
  });
  assert.equal(importRes.statusCode, 200);

  const scan = await app.inject({
    method: 'POST',
    url: `/api/mcp/servers/${serverId}/scan`,
    headers: {authorization: `Bearer ${token}`}
  });
  assert.equal(scan.statusCode, 200);
  const scanJson = scan.json() as any;
  assert.ok(scanJson.scan?.id);
  assert.ok(Array.isArray(scanJson.findings));
  assert.ok(scanJson.findings.length >= 2);

  const exportRes = await app.inject({
    method: 'GET',
    url: `/api/mcp/scans/${scanJson.scan.id}/findings.json`,
    headers: {authorization: `Bearer ${token}`}
  });
  assert.equal(exportRes.statusCode, 200);
  const exported = exportRes.json() as any;
  assert.equal(exported.scan.id, scanJson.scan.id);
  assert.ok(Array.isArray(exported.findings));

  await app.close();
});

test('mcp drift detection flags tool changes', async () => {
  const dbPath = `/tmp/ssh_mcp_drift_${Date.now()}.db`;
  const db = openDb(dbPath);
  initSchema(db);

  const runner = {async startSandbox() {return 'c1';}, async stopSandbox() {}} as any;
  const app = buildApp({db, runner, jwtSecret: 'change-me-to-a-long-random-string'});
  await app.ready();

  const reg = await app.inject({method: 'POST', url: '/api/auth/register', payload: {email: `u_${Date.now()}@example.com`, password: 'password1234'}});
  const token = (reg.json() as any).token as string;

  const createServer = await app.inject({
    method: 'POST',
    url: '/api/mcp/servers',
    headers: {authorization: `Bearer ${token}`},
    payload: {name: 'Drift MCP', environment: 'local', endpoint: 'x', authType: 'none'}
  });
  const serverId = (createServer.json() as any).server.id as string;

  await app.inject({
    method: 'POST',
    url: `/api/mcp/servers/${serverId}/tools/import`,
    headers: {authorization: `Bearer ${token}`},
    payload: {tools: [{name: 't1', description: 'ok', inputSchema: {type: 'object'}}]}
  });
  const scan1 = await app.inject({method: 'POST', url: `/api/mcp/servers/${serverId}/scan`, headers: {authorization: `Bearer ${token}`}});
  assert.equal(scan1.statusCode, 200);

  await app.inject({
    method: 'POST',
    url: `/api/mcp/servers/${serverId}/tools/import`,
    headers: {authorization: `Bearer ${token}`},
    payload: {tools: [{name: 't1', description: 'changed', inputSchema: {type: 'object'}}]}
  });
  const scan2 = await app.inject({method: 'POST', url: `/api/mcp/servers/${serverId}/scan`, headers: {authorization: `Bearer ${token}`}});
  const scan2Json = scan2.json() as any;
  const msgs = (scan2Json.findings as Array<any>).map((f) => f.title as string);
  assert.ok(msgs.some((m) => m.includes('changed since previous scan')));

  await app.close();
});

