import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

// In dev, this file lives in a normal writable folder next to local-server/.
// Once packaged, local-server/dist ends up inside the read-only app.asar archive,
// so writing there would silently fail. Electron's main process sets
// LOCAL_DB_PATH to a real writable location (app.getPath('userData')) before
// requiring this module - see electron/main.js.
const DB_PATH = process.env.LOCAL_DB_PATH || path.join(__dirname, '..', 'local.db');

let db: Database;

export async function initDb(): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm'),
  });

  db = fs.existsSync(DB_PATH) ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  persist();
}

export function persist() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

export function all(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export function run(sql: string, params: any[] = []) {
  db.run(sql, params);
  persist();
}

export function runMany(fn: () => void) {
  fn();
  persist();
}

export function runNoPersist(sql: string, params: any[] = []) {
  db.run(sql, params);
}

export function getMeta(key: string): string {
  const rows = all('SELECT value FROM meta WHERE key = ?', [key]);
  return rows[0]?.value ?? '0';
}

export function setMeta(key: string, value: string) {
  run(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}
