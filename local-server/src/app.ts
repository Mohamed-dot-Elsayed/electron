import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { all, run, getMeta } from './db';
import { syncNow } from './sync';

export function createServer() {
  const app = express();
  app.use(express.json());

  const now = () => Date.now();

  // ---------------- Categories ----------------

  app.get('/api/categories', (_req, res) => {
    res.json(all('SELECT * FROM categories WHERE deleted = 0 ORDER BY name'));
  });

  app.post('/api/categories', (req, res) => {
    const id = crypto.randomUUID();
    run('INSERT INTO categories (id, name, updated_at, deleted) VALUES (?, ?, ?, 0)', [
      id,
      req.body.name,
      now(),
    ]);
    res.json({ id, name: req.body.name });
  });

  app.put('/api/categories/:id', (req, res) => {
    run('UPDATE categories SET name = ?, updated_at = ? WHERE id = ?', [req.body.name, now(), req.params.id]);
    res.json({ ok: true });
  });

  app.delete('/api/categories/:id', (req, res) => {
    run('UPDATE categories SET deleted = 1, updated_at = ? WHERE id = ?', [now(), req.params.id]);
    res.json({ ok: true });
  });

  // ---------------- Notes ----------------

  app.get('/api/notes', (_req, res) => {
    res.json(all('SELECT * FROM notes WHERE deleted = 0 ORDER BY updated_at DESC'));
  });

  app.post('/api/notes', (req, res) => {
    const id = crypto.randomUUID();
    run('INSERT INTO notes (id, category_id, title, body, updated_at, deleted) VALUES (?, ?, ?, ?, ?, 0)', [
      id,
      req.body.category_id || null,
      req.body.title,
      req.body.body || '',
      now(),
    ]);
    res.json({ id });
  });

  app.put('/api/notes/:id', (req, res) => {
    run('UPDATE notes SET category_id = ?, title = ?, body = ?, updated_at = ? WHERE id = ?', [
      req.body.category_id || null,
      req.body.title,
      req.body.body || '',
      now(),
      req.params.id,
    ]);
    res.json({ ok: true });
  });

  app.delete('/api/notes/:id', (req, res) => {
    run('UPDATE notes SET deleted = 1, updated_at = ? WHERE id = ?', [now(), req.params.id]);
    res.json({ ok: true });
  });

  // ---------------- Sync ----------------

  app.post('/api/sync', async (_req, res) => {
    try {
      const result = await syncNow();
      res.json({ ok: true, ...result });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/sync/status', (_req, res) => {
    const lastSyncedAt = Number(getMeta('last_synced_at')) || null;
    res.json({ lastSyncedAt });
  });

  // ---------------- Serve built React app ----------------

  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  return app;
}
