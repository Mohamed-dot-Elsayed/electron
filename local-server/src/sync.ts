import { all, runMany, runNoPersist, getMeta, setMeta } from './db';

const REMOTE_URL = process.env.REMOTE_API_URL;

const upsertCategorySql = `
  INSERT INTO categories (id, name, updated_at, deleted)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    updated_at = excluded.updated_at,
    deleted = excluded.deleted
  WHERE excluded.updated_at > categories.updated_at
`;

const upsertNoteSql = `
  INSERT INTO notes (id, category_id, title, body, updated_at, deleted)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    category_id = excluded.category_id,
    title = excluded.title,
    body = excluded.body,
    updated_at = excluded.updated_at,
    deleted = excluded.deleted
  WHERE excluded.updated_at > notes.updated_at
`;

export async function syncNow() {
  // 1) PUSH - send everything changed locally since the last successful push
  const lastPush = Number(getMeta('last_push_at'));
  const categoriesOut = all('SELECT * FROM categories WHERE updated_at > ?', [lastPush]);
  const notesOut = all('SELECT * FROM notes WHERE updated_at > ?', [lastPush]);

  const pushRes = await fetch(`${REMOTE_URL}/sync/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categories: categoriesOut, notes: notesOut }),
  });
  if (!pushRes.ok) throw new Error(`Push failed: ${pushRes.status} ${await pushRes.text()}`);
  setMeta('last_push_at', String(Date.now()));

  // 2) PULL - fetch everything changed remotely since the last successful pull,
  //    merging it in with last-write-wins conflict resolution
  const lastPull = Number(getMeta('last_pull_at'));
  const pullRes = await fetch(`${REMOTE_URL}/sync/pull?since=${lastPull}`);
  if (!pullRes.ok) throw new Error(`Pull failed: ${pullRes.status} ${await pullRes.text()}`);
  const pulled = (await pullRes.json()) as { serverTime: number; categories: any[]; notes: any[] };

  runMany(() => {
    for (const c of pulled.categories) runNoPersist(upsertCategorySql, [c.id, c.name, c.updated_at, c.deleted]);
    for (const n of pulled.notes)
      runNoPersist(upsertNoteSql, [n.id, n.category_id, n.title, n.body, n.updated_at, n.deleted]);
  });

  setMeta('last_pull_at', String(pulled.serverTime));
  setMeta('last_synced_at', String(Date.now()));

  return {
    pushed: { categories: categoriesOut.length, notes: notesOut.length },
    pulled: { categories: pulled.categories.length, notes: pulled.notes.length },
    syncedAt: Number(getMeta('last_synced_at')),
  };
}
