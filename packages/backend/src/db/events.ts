import {randomUUID} from 'node:crypto';
import type {Db} from './db';

export type SandboxEventType = 'info' | 'stdout' | 'stderr' | 'error' | 'lifecycle';

export type SandboxEvent = {
  id: string;
  sandboxId: string;
  ts: number;
  type: SandboxEventType;
  message: string;
  meta: Record<string, unknown> | null;
};

export function appendEvent(db: Db, input: Omit<SandboxEvent, 'id'>): SandboxEvent {
  const event: SandboxEvent = {id: randomUUID(), ...input};
  db.prepare('INSERT INTO sandbox_events (id, sandbox_id, ts, type, message, meta_json) VALUES (?, ?, ?, ?, ?, ?)').run(
    event.id,
    event.sandboxId,
    event.ts,
    event.type,
    event.message,
    event.meta ? JSON.stringify(event.meta) : null
  );
  return event;
}

export function listEvents(db: Db, sandboxId: string, limit: number, beforeTs?: number): SandboxEvent[] {
  const rows = beforeTs
    ? (db
        .prepare(
          'SELECT id, sandbox_id as sandboxId, ts, type, message, meta_json as metaJson FROM sandbox_events WHERE sandbox_id = ? AND ts < ? ORDER BY ts DESC LIMIT ?'
        )
        .all(sandboxId, beforeTs, limit) as Array<any>)
    : (db
        .prepare(
          'SELECT id, sandbox_id as sandboxId, ts, type, message, meta_json as metaJson FROM sandbox_events WHERE sandbox_id = ? ORDER BY ts DESC LIMIT ?'
        )
        .all(sandboxId, limit) as Array<any>);

  return rows
    .map((r) => ({
      id: r.id as string,
      sandboxId: r.sandboxId as string,
      ts: r.ts as number,
      type: r.type as SandboxEventType,
      message: r.message as string,
      meta: r.metaJson ? (JSON.parse(r.metaJson) as Record<string, unknown>) : null
    }))
    .reverse();
}

