import { registerTable } from "../db/db";

registerTable(`
  CREATE TABLE IF NOT EXISTS change_log (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    op TEXT NOT NULL, -- 'insert' | 'update' | 'delete'
    old_payload TEXT, -- full row JSON before the change (update only, NULL otherwise)
    new_payload TEXT, -- full row JSON after the change (insert/update, NULL for delete)
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now')),
    synced_at TEXT
  );
`);

registerTable(`
  CREATE INDEX IF NOT EXISTS idx_change_log_unsynced
  ON change_log (table_name, synced_at);
`);

registerTable(`
  CREATE INDEX IF NOT EXISTS idx_change_log_seq
  ON change_log (seq);
`);