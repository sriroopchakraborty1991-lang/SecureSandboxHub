import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeThreat} from '../src/threat/scoring';
import type {Sandbox} from '../src/db/sandboxes';
import type {PolicyRules} from '../src/db/policies';
import type {SandboxEvent} from '../src/db/events';

test('analyzeThreat low', () => {
  const sandbox: Sandbox = {
    id: 's1',
    status: 'running',
    dockerContainerId: null,
    image: 'alpine:latest',
    command: null,
    policyId: 'p1',
    createdBy: 'u1',
    createdAt: Date.now(),
    stoppedAt: null
  };

  const policy: PolicyRules = {allowNetwork: false, memoryLimitMb: 256, cpuLimit: 0.5, readOnlyRootFs: true};

  const events: SandboxEvent[] = [{id: 'e1', sandboxId: 's1', ts: Date.now(), type: 'info', message: 'ok', meta: null}];
  const res = analyzeThreat({sandbox, policy, events});
  assert.equal(res.level, 'low');
  assert.ok(res.score < 30);
});

test('analyzeThreat high', () => {
  const sandbox: Sandbox = {
    id: 's1',
    status: 'running',
    dockerContainerId: null,
    image: 'alpine:latest',
    command: null,
    policyId: 'p1',
    createdBy: 'u1',
    createdAt: Date.now() - 11 * 60 * 1000,
    stoppedAt: null
  };

  const policy: PolicyRules = {allowNetwork: true, memoryLimitMb: 256, cpuLimit: 0.5, readOnlyRootFs: true};
  const events: SandboxEvent[] = [
    {id: 'e1', sandboxId: 's1', ts: Date.now(), type: 'error', message: 'boom', meta: null},
    {id: 'e2', sandboxId: 's1', ts: Date.now(), type: 'error', message: 'boom2', meta: null}
  ];

  const res = analyzeThreat({sandbox, policy, events});
  assert.equal(res.level, 'high');
  assert.ok(res.score >= 60);
});

