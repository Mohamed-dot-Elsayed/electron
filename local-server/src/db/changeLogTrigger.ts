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

  // NEW.<col> for the "after" snapshot
  const newJsonCols = columns.map((c) => `'${c}', NEW.${c}`).join(", ");
  // OLD.<col> for the "before" snapshot
  const oldJsonCols = columns.map((c) => `'${c}', OLD.${c}`).join(", ");

  db.run(`
    CREATE TRIGGER IF NOT EXISTS trg_${table}_insert
    AFTER INSERT ON ${table}
    BEGIN
      INSERT INTO change_log (id, table_name, record_id, op, old_payload, new_payload, created_at)
      VALUES (
        lower(hex(randomblob(16))),
        '${table}',
        NEW.${pk},
        'insert',
        NULL,
        json_object(${newJsonCols}),
        strftime('%Y-%m-%dT%H:%M:%f','now')
      );
    END;
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS trg_${table}_update
    AFTER UPDATE ON ${table}
    BEGIN
      INSERT INTO change_log (id, table_name, record_id, op, old_payload, new_payload, created_at)
      VALUES (
        lower(hex(randomblob(16))),
        '${table}',
        NEW.${pk},
        'update',
        json_object(${oldJsonCols}),
        json_object(${newJsonCols}),
        strftime('%Y-%m-%dT%H:%M:%f','now')
      );
    END;
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS trg_${table}_delete
    AFTER DELETE ON ${table}
    BEGIN
      INSERT INTO change_log (id, table_name, record_id, op, old_payload, new_payload, created_at)
      VALUES (
        lower(hex(randomblob(16))),
        '${table}',
        OLD.${pk},
        'delete',
        json_object(${oldJsonCols}),
        NULL,
        strftime('%Y-%m-%dT%H:%M:%f','now')
      );
    END;
  `);
}

export function dropTriggersForTable(db: Database, table: string) {
  db.run(`DROP TRIGGER IF EXISTS trg_${table}_insert`);
  db.run(`DROP TRIGGER IF EXISTS trg_${table}_update`);
  db.run(`DROP TRIGGER IF EXISTS trg_${table}_delete`);
}
