import { registerTable } from "../db/db";

registerTable(`
  CREATE TABLE IF NOT EXISTS change_log (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    op TEXT NOT NULL,
    payload TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    synced_at TEXT
  );
`);

registerTable(`
  CREATE INDEX IF NOT EXISTS idx_change_log_unsynced
  ON change_log (table_name, synced_at);
`);