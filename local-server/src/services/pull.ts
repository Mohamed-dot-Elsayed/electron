import axios from "axios";
import { getDB, saveDB } from "../db/db";
import {
  getAllTableNames,
  getPrimaryKeyColumn,
  getColumnNames,
} from "../db/introspect";
import {
  dropTriggersForTable,
  installTriggersForTable,
} from "../db/changeLogTrigger";
import { getLastSyncAt, setLastSyncAt } from "./appMeta";
import { sanitizeBindValues } from "../db/createModel";

const REMOTE_BASE = process.env.REMOTE_API_URL;

export async function pullAllTables() {
  const tables = getAllTableNames();
  const results: Record<string, number> = {};

  for (const table of tables) {
    results[table] = await pullTable(table);
  }

  return results;
}

async function pullTable(table: string): Promise<number> {
  const db = getDB();
  const since = getLastSyncAt(table) ?? "1970-01-01T00:00:00.000Z";

  const { data } = await axios.get(`${REMOTE_BASE}/api/sync/pull/${table}`, {
    params: { since },
  });
  console.log("Get Data From "+table);
  
  if (!data.data.changes || data.data.changes.length === 0) {
    // still advance cursor to server's clock, so we don't keep asking for "everything since epoch"
    setLastSyncAt(table, data.data.serverTime);
    return 0;
  }

  dropTriggersForTable(db, table); // remote-origin writes shouldn't re-enter change_log

  try {
    const pk = getPrimaryKeyColumn(table);
    const localColumns = getColumnNames(table);

    db.run("BEGIN TRANSACTION");
    try {
      for (const change of data.data.changes) {
        if (change.op === "delete") {
          db.run(`DELETE FROM ${table} WHERE ${pk} = ?`, [change.record_id]);
        } else {
          applyUpsert(db, table, change.data, localColumns, pk);
        }
      }
      db.run("COMMIT");
    } catch (err) {
      db.run("ROLLBACK");
      throw err; // cursor NOT advanced -> safe retry next pull cycle
    }

    saveDB();
    setLastSyncAt(table, data.data.serverTime); // only advance after successful commit
    console.log(`Pulled ${data.data.changes.length} changes for ${table}`);
    return data.data.changes.length;
  } finally {
    installTriggersForTable(db, table); // always restore
  }
}

function applyUpsert(
  db: any,
  table: string,
  row: Record<string, any>,
  localColumns: string[],
  pk: string
) {
  const stmt = db.prepare(`SELECT updatedAt FROM ${table} WHERE ${pk} = ?`);
  stmt.bind(sanitizeBindValues([row[pk]]));
  let localUpdatedAt: string | undefined = undefined;
  if (stmt.step()) {
    localUpdatedAt = stmt.getAsObject().updatedAt;
  }
  stmt.free();

  if (
    localUpdatedAt &&
    row.updated_at &&
    new Date(localUpdatedAt) > new Date(row.updated_at)
  ) {
    console.log(`Skipping ${table}/${row[pk]} — local version is newer (LWW)`);
    return;
  }

  const columns = Object.keys(row).filter((c) => localColumns.includes(c));
  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns
    .filter((c) => c !== pk)
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");

  db.run(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})
     ON CONFLICT(${pk}) DO UPDATE SET ${updates}`,
    sanitizeBindValues(columns.map((c) => row[c]))
  );
}
