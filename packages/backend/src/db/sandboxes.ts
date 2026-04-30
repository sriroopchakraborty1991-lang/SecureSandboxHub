import {randomUUID} from 'node:crypto';
import type {Db} from './db';

export type SandboxStatus = 'running' | 'stopped' | 'error';

export type Sandbox = {
  id: string;
  status: SandboxStatus;
  dockerContainerId: string | null;
  image: string;
  command: string[] | null;
  policyId: string;
  createdBy: string;
  createdAt: number;
  stoppedAt: number | null;
};

export function createSandbox(db: Db, input: {image: string; command: string[] | null; policyId: string; createdBy: string}): Sandbox {
  const sandbox: Sandbox = {
    id: randomUUID(),
    status: 'running',
    dockerContainerId: null,
    image: input.image,
    command: input.command,
    policyId: input.policyId,
    createdBy: input.createdBy,
    createdAt: Date.now(),
    stoppedAt: null
  };

  db.prepare(
    'INSERT INTO sandboxes (id, status, docker_container_id, image, command_json, policy_id, created_by, created_at, stopped_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    sandbox.id,
    sandbox.status,
    sandbox.dockerContainerId,
    sandbox.image,
    sandbox.command ? JSON.stringify(sandbox.command) : null,
    sandbox.policyId,
    sandbox.createdBy,
    sandbox.createdAt,
    sandbox.stoppedAt
  );

  return sandbox;
}

export function setSandboxContainerId(db: Db, sandboxId: string, createdBy: string, dockerContainerId: string): void {
  db.prepare('UPDATE sandboxes SET docker_container_id = ? WHERE id = ? AND created_by = ?').run(dockerContainerId, sandboxId, createdBy);
}

export function setSandboxStatus(db: Db, sandboxId: string, createdBy: string, status: SandboxStatus, stoppedAt: number | null): void {
  db.prepare('UPDATE sandboxes SET status = ?, stopped_at = ? WHERE id = ? AND created_by = ?').run(status, stoppedAt, sandboxId, createdBy);
}

export function listSandboxes(db: Db, createdBy: string): Sandbox[] {
  const rows = db
    .prepare(
      'SELECT id, status, docker_container_id as dockerContainerId, image, command_json as commandJson, policy_id as policyId, created_by as createdBy, created_at as createdAt, stopped_at as stoppedAt FROM sandboxes WHERE created_by = ? ORDER BY created_at DESC'
    )
    .all(createdBy) as Array<{
    id: string;
    status: SandboxStatus;
    dockerContainerId: string | null;
    image: string;
    commandJson: string | null;
    policyId: string;
    createdBy: string;
    createdAt: number;
    stoppedAt: number | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    dockerContainerId: r.dockerContainerId,
    image: r.image,
    command: r.commandJson ? (JSON.parse(r.commandJson) as string[]) : null,
    policyId: r.policyId,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
    stoppedAt: r.stoppedAt
  }));
}

export function getSandboxById(db: Db, sandboxId: string, createdBy: string): Sandbox | null {
  const row = db
    .prepare(
      'SELECT id, status, docker_container_id as dockerContainerId, image, command_json as commandJson, policy_id as policyId, created_by as createdBy, created_at as createdAt, stopped_at as stoppedAt FROM sandboxes WHERE id = ? AND created_by = ?'
    )
    .get(sandboxId, createdBy) as
    | {
        id: string;
        status: SandboxStatus;
        dockerContainerId: string | null;
        image: string;
        commandJson: string | null;
        policyId: string;
        createdBy: string;
        createdAt: number;
        stoppedAt: number | null;
      }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    status: row.status,
    dockerContainerId: row.dockerContainerId,
    image: row.image,
    command: row.commandJson ? (JSON.parse(row.commandJson) as string[]) : null,
    policyId: row.policyId,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    stoppedAt: row.stoppedAt
  };
}

