import { getDB, registerTable } from "./db";

registerTable(`
  CREATE TABLE IF NOT EXISTS image_cache (
    path TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TEXT
  );
`);

export function enqueuePendingImages(urls: string[]) {
  if (!urls.length) return;
  const db = getDB();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO image_cache (path, status) VALUES (?, 'pending')`
  );
  for (const url of urls) {
    if (!url) continue;
    stmt.run([url]);
  }
  stmt.free();
  // no saveDB() here — caller's existing saveDB() after the transaction covers it
}

export function getPendingImages(retryCap = 5): string[] {
  const db = getDB();
  const stmt = db.prepare(
    `SELECT path FROM image_cache WHERE status = 'pending' OR (status = 'failed' AND retry_count < ?)`
  );
  stmt.bind([retryCap]);
  const rows: string[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject().path as string);
  stmt.free();
  return rows;
}

export function markImageStatus(path: string, status: "downloaded" | "failed" | "missing") {
  const db = getDB();
  if (status === "failed") {
    db.run(
      `UPDATE image_cache SET status = ?, retry_count = retry_count + 1, last_attempt_at = ? WHERE path = ?`,
      [status, new Date().toISOString(), path]
    );
  } else {
    db.run(
      `UPDATE image_cache SET status = ?, last_attempt_at = ? WHERE path = ?`,
      [status, new Date().toISOString(), path]
    );
  }
}