import {randomUUID, createHash} from 'node:crypto';
import type {Db} from './db';

export type McpServer = {
  id: string;
  name: string;
  environment: 'local' | 'dev' | 'staging' | 'prod';
  endpoint: string;
  authType: 'none' | 'token';
  ownerTag: string | null;
  createdBy: string;
  createdAt: number;
};

export type McpTool = {
  id: string;
  serverId: string;
  name: string;
  description: string | null;
  inputSchema: unknown | null;
  toolHash: string;
  createdAt: number;
  updatedAt: number;
};

export type McpFindingSeverity = 'low' | 'medium' | 'high';

export type McpFinding = {
  id: string;
  scanId: string;
  serverId: string;
  toolName: string | null;
  severity: McpFindingSeverity;
  category: string;
  title: string;
  evidence: Record<string, unknown> | null;
  recommendation: string;
  createdAt: number;
};

export type McpScan = {
  id: string;
  serverId: string;
  createdBy: string;
  createdAt: number;
  summary: Record<string, unknown>;
  toolsSnapshot: Array<{name: string; toolHash: string}>;
};

export function computeToolHash(input: {name: string; description: string | null; inputSchema: unknown | null}): string {
  const payload = JSON.stringify({name: input.name, description: input.description ?? null, inputSchema: input.inputSchema ?? null});
  return createHash('sha256').update(payload).digest('hex');
}

export function createMcpServer(
  db: Db,
  input: {
    name: string;
    environment: McpServer['environment'];
    endpoint: string;
    authType: McpServer['authType'];
    authToken: string | null;
    ownerTag: string | null;
    createdBy: string;
  }
): McpServer {
  const server: McpServer = {
    id: randomUUID(),
    name: input.name,
    environment: input.environment,
    endpoint: input.endpoint,
    authType: input.authType,
    ownerTag: input.ownerTag,
    createdBy: input.createdBy,
    createdAt: Date.now()
  };

  db.prepare(
    'INSERT INTO mcp_servers (id, name, environment, endpoint, auth_type, auth_token, owner_tag, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(server.id, server.name, server.environment, server.endpoint, server.authType, input.authToken, server.ownerTag, server.createdBy, server.createdAt);

  return server;
}

export function listMcpServers(db: Db, createdBy: string): McpServer[] {
  const rows = db
    .prepare(
      'SELECT id, name, environment, endpoint, auth_type as authType, owner_tag as ownerTag, created_by as createdBy, created_at as createdAt FROM mcp_servers WHERE created_by = ? ORDER BY created_at DESC'
    )
    .all(createdBy) as Array<any>;

  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    environment: r.environment as McpServer['environment'],
    endpoint: r.endpoint as string,
    authType: r.authType as McpServer['authType'],
    ownerTag: (r.ownerTag as string | null) ?? null,
    createdBy: r.createdBy as string,
    createdAt: r.createdAt as number
  }));
}

export function getMcpServerById(db: Db, serverId: string, createdBy: string): McpServer | null {
  const row = db
    .prepare(
      'SELECT id, name, environment, endpoint, auth_type as authType, owner_tag as ownerTag, created_by as createdBy, created_at as createdAt FROM mcp_servers WHERE id = ? AND created_by = ?'
    )
    .get(serverId, createdBy) as any | undefined;
  if (!row) return null;
  return {
    id: row.id as string,
    name: row.name as string,
    environment: row.environment as McpServer['environment'],
    endpoint: row.endpoint as string,
    authType: row.authType as McpServer['authType'],
    ownerTag: (row.ownerTag as string | null) ?? null,
    createdBy: row.createdBy as string,
    createdAt: row.createdAt as number
  };
}

export function upsertMcpTools(
  db: Db,
  input: {serverId: string; createdBy: string; tools: Array<{name: string; description?: string | null; inputSchema?: unknown | null}>}
): {created: number; updated: number; total: number} {
  const now = Date.now();
  let created = 0;
  let updated = 0;

  const server = db.prepare('SELECT id FROM mcp_servers WHERE id = ? AND created_by = ?').get(input.serverId, input.createdBy) as {id: string} | undefined;
  if (!server) throw new Error('mcp_server_not_found');

  const stmtInsert = db.prepare(
    'INSERT INTO mcp_tools (id, server_id, name, description, input_schema_json, tool_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const stmtUpdate = db.prepare('UPDATE mcp_tools SET description = ?, input_schema_json = ?, tool_hash = ?, updated_at = ? WHERE server_id = ? AND name = ?');
  const stmtGet = db.prepare('SELECT id, tool_hash as toolHash FROM mcp_tools WHERE server_id = ? AND name = ?');

  for (const t of input.tools) {
    const description = typeof t.description === 'string' ? t.description : t.description ?? null;
    const inputSchema = typeof t.inputSchema === 'undefined' ? null : t.inputSchema ?? null;
    const toolHash = computeToolHash({name: t.name, description, inputSchema});

    const existing = stmtGet.get(input.serverId, t.name) as {id: string; toolHash: string} | undefined;
    if (!existing) {
      stmtInsert.run(randomUUID(), input.serverId, t.name, description, inputSchema ? JSON.stringify(inputSchema) : null, toolHash, now, now);
      created += 1;
    } else {
      if (existing.toolHash !== toolHash) updated += 1;
      stmtUpdate.run(description, inputSchema ? JSON.stringify(inputSchema) : null, toolHash, now, input.serverId, t.name);
    }
  }

  const row = db.prepare('SELECT COUNT(*) as c FROM mcp_tools WHERE server_id = ?').get(input.serverId) as {c: number};
  return {created, updated, total: row.c};
}

export function listMcpTools(db: Db, serverId: string, createdBy: string): McpTool[] {
  const server = db.prepare('SELECT id FROM mcp_servers WHERE id = ? AND created_by = ?').get(serverId, createdBy) as {id: string} | undefined;
  if (!server) return [];

  const rows = db
    .prepare(
      'SELECT id, server_id as serverId, name, description, input_schema_json as inputSchemaJson, tool_hash as toolHash, created_at as createdAt, updated_at as updatedAt FROM mcp_tools WHERE server_id = ? ORDER BY name ASC'
    )
    .all(serverId) as Array<any>;

  return rows.map((r) => ({
    id: r.id as string,
    serverId: r.serverId as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    inputSchema: r.inputSchemaJson ? (JSON.parse(r.inputSchemaJson) as unknown) : null,
    toolHash: r.toolHash as string,
    createdAt: r.createdAt as number,
    updatedAt: r.updatedAt as number
  }));
}

export function createMcpScan(db: Db, input: {serverId: string; createdBy: string; summary: Record<string, unknown>; toolsSnapshot: Array<{name: string; toolHash: string}>}): McpScan {
  const scan: McpScan = {
    id: randomUUID(),
    serverId: input.serverId,
    createdBy: input.createdBy,
    createdAt: Date.now(),
    summary: input.summary,
    toolsSnapshot: input.toolsSnapshot
  };

  db.prepare('INSERT INTO mcp_scans (id, server_id, created_by, created_at, summary_json, tools_snapshot_json) VALUES (?, ?, ?, ?, ?, ?)').run(
    scan.id,
    scan.serverId,
    scan.createdBy,
    scan.createdAt,
    JSON.stringify(scan.summary),
    JSON.stringify(scan.toolsSnapshot)
  );

  return scan;
}

export function insertMcpFindings(db: Db, findings: Array<Omit<McpFinding, 'id' | 'createdAt'>>): void {
  const now = Date.now();
  const stmt = db.prepare(
    'INSERT INTO mcp_findings (id, scan_id, server_id, tool_name, severity, category, title, evidence_json, recommendation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const tx = db.transaction(() => {
    for (const f of findings) {
      stmt.run(
        randomUUID(),
        f.scanId,
        f.serverId,
        f.toolName ?? null,
        f.severity,
        f.category,
        f.title,
        f.evidence ? JSON.stringify(f.evidence) : null,
        f.recommendation,
        now
      );
    }
  });
  tx();
}

export function getLatestMcpScan(db: Db, serverId: string, createdBy: string): McpScan | null {
  const row = db
    .prepare('SELECT id, server_id as serverId, created_by as createdBy, created_at as createdAt, summary_json as summaryJson, tools_snapshot_json as toolsSnapshotJson FROM mcp_scans WHERE server_id = ? AND created_by = ? ORDER BY created_at DESC LIMIT 1')
    .get(serverId, createdBy) as any | undefined;
  if (!row) return null;
  return {
    id: row.id as string,
    serverId: row.serverId as string,
    createdBy: row.createdBy as string,
    createdAt: row.createdAt as number,
    summary: JSON.parse(row.summaryJson) as Record<string, unknown>,
    toolsSnapshot: JSON.parse(row.toolsSnapshotJson) as Array<{name: string; toolHash: string}>
  };
}

export function listMcpScans(db: Db, createdBy: string, serverId?: string): McpScan[] {
  const rows = serverId
    ? (db
        .prepare(
          'SELECT id, server_id as serverId, created_by as createdBy, created_at as createdAt, summary_json as summaryJson, tools_snapshot_json as toolsSnapshotJson FROM mcp_scans WHERE created_by = ? AND server_id = ? ORDER BY created_at DESC'
        )
        .all(createdBy, serverId) as Array<any>)
    : (db
        .prepare(
          'SELECT id, server_id as serverId, created_by as createdBy, created_at as createdAt, summary_json as summaryJson, tools_snapshot_json as toolsSnapshotJson FROM mcp_scans WHERE created_by = ? ORDER BY created_at DESC'
        )
        .all(createdBy) as Array<any>);

  return rows.map((r) => ({
    id: r.id as string,
    serverId: r.serverId as string,
    createdBy: r.createdBy as string,
    createdAt: r.createdAt as number,
    summary: JSON.parse(r.summaryJson) as Record<string, unknown>,
    toolsSnapshot: JSON.parse(r.toolsSnapshotJson) as Array<{name: string; toolHash: string}>
  }));
}

export function listMcpFindingsByScan(db: Db, scanId: string, createdBy: string): McpFinding[] {
  const scan = db.prepare('SELECT id FROM mcp_scans WHERE id = ? AND created_by = ?').get(scanId, createdBy) as {id: string} | undefined;
  if (!scan) return [];

  const rows = db
    .prepare(
      'SELECT id, scan_id as scanId, server_id as serverId, tool_name as toolName, severity, category, title, evidence_json as evidenceJson, recommendation, created_at as createdAt FROM mcp_findings WHERE scan_id = ? ORDER BY created_at DESC'
    )
    .all(scanId) as Array<any>;

  return rows.map((r) => ({
    id: r.id as string,
    scanId: r.scanId as string,
    serverId: r.serverId as string,
    toolName: (r.toolName as string | null) ?? null,
    severity: r.severity as McpFindingSeverity,
    category: r.category as string,
    title: r.title as string,
    evidence: r.evidenceJson ? (JSON.parse(r.evidenceJson) as Record<string, unknown>) : null,
    recommendation: r.recommendation as string,
    createdAt: r.createdAt as number
  }));
}

export function listRecentMcpFindings(db: Db, createdBy: string, limit: number): McpFinding[] {
  const rows = db
    .prepare(
      `SELECT f.id, f.scan_id as scanId, f.server_id as serverId, f.tool_name as toolName, f.severity, f.category, f.title, f.evidence_json as evidenceJson, f.recommendation, f.created_at as createdAt
       FROM mcp_findings f
       JOIN mcp_scans s ON s.id = f.scan_id
       WHERE s.created_by = ?
       ORDER BY f.created_at DESC
       LIMIT ?`
    )
    .all(createdBy, limit) as Array<any>;

  return rows.map((r) => ({
    id: r.id as string,
    scanId: r.scanId as string,
    serverId: r.serverId as string,
    toolName: (r.toolName as string | null) ?? null,
    severity: r.severity as McpFindingSeverity,
    category: r.category as string,
    title: r.title as string,
    evidence: r.evidenceJson ? (JSON.parse(r.evidenceJson) as Record<string, unknown>) : null,
    recommendation: r.recommendation as string,
    createdAt: r.createdAt as number
  }));
}

