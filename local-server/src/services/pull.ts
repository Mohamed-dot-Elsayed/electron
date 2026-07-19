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
const SYNC_CURSOR_KEY = "_global"; // remote doesn't filter by table, so one cursor for all

type RemoteChange = {
  table_name: string;
  op: "insert" | "update" | "delete";
  record_id: string;
  data?: Record<string, any>;
};

export async function pullAllTables(): Promise<Record<string, number>> {
  const db = getDB();
  const knownTables = new Set(getAllTableNames());
  const since = getLastSyncAt(SYNC_CURSOR_KEY) ?? "1970-01-01T00:00:00.000Z";

  const { data } = await axios.get(`${REMOTE_BASE}/api/sync/pull`, {
    params: { since },
  });

  const changes: RemoteChange[] = data.data.changes ?? [];
  const serverTime: string = data.data.serverTime;
  const results: Record<string, number> = {};

  if (changes.length === 0) {
    setLastSyncAt(SYNC_CURSOR_KEY, serverTime);
    console.log("No changes on Server");
    return results;
  }

  // group remote changes by table so we only touch triggers/columns once per table
  const byTable = new Map<string, RemoteChange[]>();
  for (const change of changes) {
    if (!knownTables.has(change.table_name)) {
      console.warn(`Skipping change for unknown table "${change.table_name}"`);
      continue;
    }
    if (!byTable.has(change.table_name)) byTable.set(change.table_name, []);
    byTable.get(change.table_name)!.push(change);
  }

  let allSucceeded = true;

  for (const [table, tableChanges] of byTable) {
    dropTriggersForTable(db, table); // remote-origin writes shouldn't re-enter change_log
    try {
      const pk = getPrimaryKeyColumn(table);
      const localColumns = getColumnNames(table);

      db.run("BEGIN TRANSACTION");
      try {
        for (const change of tableChanges) {
          if (change.op === "delete") {
            db.run(`DELETE FROM ${table} WHERE ${pk} = ?`, [change.record_id]);
          } else {
            applyUpsert(db, table, change.data!, localColumns, pk);
          }
        }
        db.run("COMMIT");
        results[table] = tableChanges.length;
        console.log(`Pulled ${tableChanges.length} changes for ${table}`);
      } catch (err) {
        db.run("ROLLBACK");
        allSucceeded = false;
        results[table] = 0;
        console.error(`Failed applying changes for ${table}:`, err);
      }
    } finally {
      installTriggersForTable(db, table); // always restore
    }
  }

  saveDB();

  // only advance the cursor if every table applied cleanly; upserts/deletes are
  // idempotent, so retrying the whole batch (including already-applied tables)
  // next pull is safe and simpler than tracking a per-table watermark against
  // a single global change feed.
  if (allSucceeded) {
    setLastSyncAt(SYNC_CURSOR_KEY, serverTime);
  } else {
    console.warn("Some tables failed to sync — cursor not advanced, will retry next pull");
  }

  return results;
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

  const remoteUpdatedAt = row.updatedAt ?? row.updated_at;
  if (localUpdatedAt && remoteUpdatedAt && new Date(localUpdatedAt) > new Date(remoteUpdatedAt)) {
    console.log(`Skipping ${table}/${row[pk]} — local version is newer (LWW)`);
    return;
  }

  const columns = Object.keys(row).filter((c) => localColumns.includes(c));
  if (columns.length === 0) return;

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