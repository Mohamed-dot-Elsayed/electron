import express from 'express';
import { all, run, runMany, runNoPersist } from './db';

export function createServer() {
  const app = express();
  app.use(express.json());

  app.get('/categories', (_req, res) => {
    res.json(all('SELECT * FROM categories WHERE deleted = 0'));
  });
  app.get('/notes', (_req, res) => {
    res.json(all('SELECT * FROM notes WHERE deleted = 0'));
  });

  // ---------------- SYNC ----------------

  app.get('/sync/pull', (req, res) => {
    const since = Number(req.query.since || 0);
    const categories = all('SELECT * FROM categories WHERE updated_at > ?', [since]);
    const notes = all('SELECT * FROM notes WHERE updated_at > ?', [since]);
    res.json({ serverTime: Date.now(), categories, notes });
  });

  app.post('/sync/push', (req, res) => {
    const categories = req.body.categories || [];
    const notes = req.body.notes || [];

    const upsertCategory = `
      INSERT INTO categories (id, name, updated_at, deleted)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        updated_at = excluded.updated_at,
        deleted = excluded.deleted
      WHERE excluded.updated_at > categories.updated_at
    `;
    const upsertNote = `
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

    runMany(() => {
      for (const c of categories) runNoPersist(upsertCategory, [c.id, c.name, c.updated_at, c.deleted]);
      for (const n of notes) runNoPersist(upsertNote, [n.id, n.category_id, n.title, n.body, n.updated_at, n.deleted]);
    });

    res.json({ ok: true, received: { categories: categories.length, notes: notes.length } });
  });

  return app;
}
