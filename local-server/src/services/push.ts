import axios from "axios";
import { getDB, saveDB } from "../db/db";

const REMOTE_BASE = process.env.REMOTE_API_URL;
const BATCH_SIZE = 100;

export async function pushAllChanges() {
  const db = getDB();

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

  console.log(`Pushing ${changes.length} changes...`);

  const { data } = await axios.post(`${REMOTE_BASE}/api/sync/push`, { changes });

  if (data.applied?.length) {
    const placeholders = data.applied.map(() => "?").join(", ");
    db.run(
      `UPDATE change_log SET synced_at = datetime('now') WHERE id IN (${placeholders})`,
      data.applied
    );
    saveDB();
    console.log(`Marked ${data.applied.length} changes as synced`);
  }

  if (data.failed?.length) {
    console.error(`${data.failed.length} changes failed to push:`, data.failed);
    // left unsynced on purpose -> retried next push cycle
  }

  // if there were exactly BATCH_SIZE rows, there might be more waiting -> recurse
  if (changes.length === BATCH_SIZE) {
    return pushAllChanges();
  }

  return { pushed: data.applied?.length ?? 0 };
}