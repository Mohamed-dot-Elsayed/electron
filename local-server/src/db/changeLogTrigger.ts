import { Database } from "sql.js";
import { getAllTableNames, getPrimaryKeyColumn, getColumnNames } from "./introspect";

export function installChangeLogTriggers(db: Database) {
  const tables = getAllTableNames();
  for (const table of tables) {
    installTriggersForTable(db, table);
  }
}

export function installTriggersForTable(db: Database, table: string) {
  const pk = getPrimaryKeyColumn(table);
  const columns = getColumnNames(table);
  const jsonCols = columns.map((c) => `'${c}', ${c}`).join(", ");

  db.run(`
    CREATE TRIGGER IF NOT EXISTS trg_${table}_insert
    AFTER INSERT ON ${table}
    BEGIN
      INSERT INTO change_log (id, table_name, record_id, op, payload, created_at)
      VALUES (
        lower(hex(randomblob(16))),
        '${table}',
        NEW.${pk},
        'upsert',
        (SELECT json_object(${jsonCols}) FROM ${table} WHERE ${pk} = NEW.${pk}),
        datetime('now')
      );
    END;
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS trg_${table}_update
    AFTER UPDATE ON ${table}
    BEGIN
      INSERT INTO change_log (id, table_name, record_id, op, payload, created_at)
      VALUES (
        lower(hex(randomblob(16))),
        '${table}',
        NEW.${pk},
        'upsert',
        (SELECT json_object(${jsonCols}) FROM ${table} WHERE ${pk} = NEW.${pk}),
        datetime('now')
      );
    END;
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS trg_${table}_delete
    AFTER DELETE ON ${table}
    BEGIN
      INSERT INTO change_log (id, table_name, record_id, op, payload, created_at)
      VALUES (
        lower(hex(randomblob(16))),
        '${table}',
        OLD.${pk},
        'delete',
        NULL,
        datetime('now')
      );
    END;
  `);
}

export function dropTriggersForTable(db: Database, table: string) {
  db.run(`DROP TRIGGER IF EXISTS trg_${table}_insert`);
  db.run(`DROP TRIGGER IF EXISTS trg_${table}_update`);
  db.run(`DROP TRIGGER IF EXISTS trg_${table}_delete`);
}