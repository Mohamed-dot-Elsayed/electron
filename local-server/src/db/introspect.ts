import { getDB } from "./db";

const SYSTEM_TABLES = ["change_log", "app_meta","image_cache"];

export function getAllTableNames(): string[] {
  const db = getDB();
  const res = db.exec(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
  `);
  if (!res[0]) return [];
  return res[0].values
    .map((row) => row[0] as string)
    .filter((name) => !SYSTEM_TABLES.includes(name));
}

export function getPrimaryKeyColumn(table: string): string {
  const db = getDB();
  const res = db.exec(`PRAGMA table_info(${table})`);
  const row = res[0].values.find((r) => r[5] === 1); // pk flag is column index 5
  if (!row) throw new Error(`No primary key found for table ${table}`);
  return row[1] as string; // column name
}

export function getColumnNames(table: string): string[] {
  const db = getDB();
  const res = db.exec(`PRAGMA table_info(${table})`);
  return res[0].values.map((r) => r[1] as string);
}