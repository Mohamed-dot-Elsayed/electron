import axios from "axios";
import { getDB, saveDB } from "../db/db";
import { deserializeRow } from "../db/createModel";
import { getModelSchema } from "../db/model-registry";
import { getOrCreateClientId } from "./appMeta";
import { table } from "console";

const REMOTE_BASE = process.env.REMOTE_API_URL;
const BATCH_SIZE = 100;

export async function pushAllChanges() {
  const db = getDB();
  const clientId = getOrCreateClientId();

  const res = db.exec(`
    SELECT id, table_name, record_id, op, payload, created_at
    FROM change_log
    WHERE synced_at IS NULL
    ORDER BY created_at ASC
    LIMIT ${BATCH_SIZE}
  `);

  if (!res[0]) {
    console.log("No pending changes to push");
    return { pushed: 0 };
  }

  const columns = res[0].columns;
  const changes = res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, i) => (obj[col] = row[i]));
    return obj;
  });

  // After building `changes` from change_log, do this:
  const deserializedChanges = changes.map((change) => {
    try {
      const schema = getModelSchema(change.table_name);
      if (!schema) return change; // unmanaged table, leave as is

      // The payload is already a JSON string. Parse it to get the row object.
      const rawRow = JSON.parse(change.payload);
      // Deserialize fields (e.g., arrays, dates, booleans) back to native types.
      const nativeRow = deserializeRow(schema, rawRow);
      // Re-stringify with correct types.
      return { ...change, payload: JSON.stringify(nativeRow) };
    } catch (err) {
      console.error(`Failed to deserialize change ${change.id}`, err);
      return change; // leave unsynced to retry after fixing
    }
  });

  console.log(`Pushing ${changes.length} changes...`);

  // Push the deserialized changes
  const { data } = await axios.post(`${REMOTE_BASE}/api/sync/push`, {
    changes: deserializedChanges,
    clientId,
  });


  console.log(data.data.applied);

  if (data.data.applied?.length) {
    const placeholders = data.data.applied.map(() => "?").join(", ");
    db.run(
      `UPDATE change_log SET synced_at = datetime('now') WHERE id IN (${placeholders})`,
      data.data.applied
    );
    saveDB();
    console.log(`Marked ${data.data.applied.length} changes as synced`);
  }

  if (data.data.failed?.length) {
    console.error(`${data.data.failed.length} changes failed to push:`, data.data.failed);
    // left unsynced on purpose -> retried next push cycle
  }

  // if there were exactly BATCH_SIZE rows, there might be more waiting -> recurse
  if (changes.length === BATCH_SIZE) {
    return pushAllChanges();
  }

  return { pushed: data.data.applied?.length ?? 0 };
}
