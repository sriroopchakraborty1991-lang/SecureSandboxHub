import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export type Db = Database.Database;

export function openDb(databasePath: string): Db {
  const dir = path.dirname(databasePath);
  fs.mkdirSync(dir, {recursive: true});
  return new Database(databasePath);
}

export function initSchema(db: Db): void {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rules_json TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sandboxes (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      docker_container_id TEXT,
      image TEXT NOT NULL,
      command_json TEXT,
      policy_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      stopped_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sandbox_events (
      id TEXT PRIMARY KEY,
      sandbox_id TEXT NOT NULL,
      ts INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      meta_json TEXT
    );

    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      environment TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      auth_type TEXT NOT NULL,
      auth_token TEXT,
      owner_tag TEXT,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mcp_tools (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      input_schema_json TEXT,
      tool_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(server_id, name)
    );

    CREATE TABLE IF NOT EXISTS mcp_scans (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      summary_json TEXT NOT NULL,
      tools_snapshot_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mcp_findings (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL,
      server_id TEXT NOT NULL,
      tool_name TEXT,
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      evidence_json TEXT,
      recommendation TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
}
