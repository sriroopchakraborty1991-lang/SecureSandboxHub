import {randomUUID} from 'node:crypto';
import type {Db} from './db';

export type PolicyRules = {
  allowNetwork: boolean;
  memoryLimitMb: number;
  cpuLimit: number;
  readOnlyRootFs: boolean;
};

export type Policy = {
  id: string;
  name: string;
  rules: PolicyRules;
  createdBy: string;
  createdAt: number;
};

export function createPolicy(db: Db, input: {name: string; rules: PolicyRules; createdBy: string}): Policy {
  const policy: Policy = {
    id: randomUUID(),
    name: input.name,
    rules: input.rules,
    createdBy: input.createdBy,
    createdAt: Date.now()
  };

  db.prepare('INSERT INTO policies (id, name, rules_json, created_by, created_at) VALUES (?, ?, ?, ?, ?)').run(
    policy.id,
    policy.name,
    JSON.stringify(policy.rules),
    policy.createdBy,
    policy.createdAt
  );

  return policy;
}

export function listPolicies(db: Db, createdBy: string): Policy[] {
  const rows = db
    .prepare('SELECT id, name, rules_json as rulesJson, created_by as createdBy, created_at as createdAt FROM policies WHERE created_by = ? ORDER BY created_at DESC')
    .all(createdBy) as Array<{id: string; name: string; rulesJson: string; createdBy: string; createdAt: number}>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    rules: JSON.parse(r.rulesJson) as PolicyRules,
    createdBy: r.createdBy,
    createdAt: r.createdAt
  }));
}

export function getPolicyById(db: Db, id: string, createdBy: string): Policy | null {
  const row = db
    .prepare(
      'SELECT id, name, rules_json as rulesJson, created_by as createdBy, created_at as createdAt FROM policies WHERE id = ? AND created_by = ?'
    )
    .get(id, createdBy) as {id: string; name: string; rulesJson: string; createdBy: string; createdAt: number} | undefined;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    rules: JSON.parse(row.rulesJson) as PolicyRules,
    createdBy: row.createdBy,
    createdAt: row.createdAt
  };
}

export const policyTemplates: Array<{name: string; rules: PolicyRules}> = [
  {
    name: 'Default (No Network)',
    rules: {allowNetwork: false, memoryLimitMb: 256, cpuLimit: 0.5, readOnlyRootFs: true}
  },
  {
    name: 'Network Allowed',
    rules: {allowNetwork: true, memoryLimitMb: 512, cpuLimit: 1, readOnlyRootFs: true}
  }
];

