import { Database } from "sql.js";

const SYSTEM_TABLES = ["change_log", "app_meta"];

export function installChangeLogTriggers(db: Database) {
  const tables = getAllTableNames(db);

  for (const table of tables) {
    // INSERT
    db.run(`
      CREATE TRIGGER IF NOT EXISTS trg_${table}_insert
      AFTER INSERT ON ${table}
      BEGIN
        INSERT INTO change_log (id, table_name, record_id, op, payload, created_at)
        VALUES (
          lower(hex(randomblob(16))),
          '${table}',
          NEW._id,
          'upsert',
          (SELECT json_object(${jsonColumns(db, table)}) FROM ${table} WHERE _id = NEW._id),
          datetime('now')
        );
      END;
    `);

    // UPDATE
    db.run(`
      CREATE TRIGGER IF NOT EXISTS trg_${table}_update
      AFTER UPDATE ON ${table}
      BEGIN
        INSERT INTO change_log (id, table_name, record_id, op, payload, created_at)
        VALUES (
          lower(hex(randomblob(16))),
          '${table}',
          NEW._id,
          'upsert',
          (SELECT json_object(${jsonColumns(db, table)}) FROM ${table} WHERE _id = NEW._id),
          datetime('now')
        );
      END;
    `);

    // DELETE
    db.run(`
      CREATE TRIGGER IF NOT EXISTS trg_${table}_delete
      AFTER DELETE ON ${table}
      BEGIN
        INSERT INTO change_log (id, table_name, record_id, op, payload, created_at)
        VALUES (
          lower(hex(randomblob(16))),
          '${table}',
          OLD._id,
          'delete',
          NULL,
          datetime('now')
        );
      END;
    `);
  }
}

function getAllTableNames(db: Database): string[] {
  const res = db.exec(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
  `);
  if (!res[0]) return [];
  return res[0].values
    .map((row) => row[0] as string)
    .filter((name) => !SYSTEM_TABLES.includes(name));
}

function jsonColumns(db: Database, table: string): string {
  const res = db.exec(`PRAGMA table_info(${table})`);
  const columns = res[0].values.map((row) => row[1] as string); // column name
  return columns.map((c) => `'${c}', ${c}`).join(", ");
}