import { useEffect, useState } from 'react';

const api = {
  get: (url) => fetch(url).then((r) => r.json()),
  post: (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
  put: (url, body) => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
  del: (url) => fetch(url, { method: 'DELETE' }).then((r) => r.json()),
};

export default function App() {
  const [categories, setCategories] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [newNote, setNewNote] = useState({ title: '', body: '', category_id: '' });
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const loadAll = async () => {
    setCategories(await api.get('/api/categories'));
    setNotes(await api.get('/api/notes'));
    const status = await api.get('/api/sync/status');
    setLastSyncedAt(status.lastSyncedAt);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await api.post('/api/categories', { name: newCategory.trim() });
    setNewCategory('');
    loadAll();
  };

  const deleteCategory = async (id) => {
    await api.del(`/api/categories/${id}`);
    loadAll();
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!newNote.title.trim()) return;
    await api.post('/api/notes', newNote);
    setNewNote({ title: '', body: '', category_id: '' });
    loadAll();
  };

  const deleteNote = async (id) => {
    await api.del(`/api/notes/${id}`);
    loadAll();
  };

  const runSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await api.post('/api/sync', {});
      setSyncResult(result);
      await loadAll();
    } catch (err) {
      setSyncResult({ ok: false, error: String(err) });
    } finally {
      setSyncing(false);
    }
  };

  const categoryName = (id) => categories.find((c) => c.id === id)?.name || '(none)';

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Local + Cloud Sync Demo None.</h1>
        <div style={{ textAlign: 'right' }}>
          <button onClick={runSync} disabled={syncing} style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 4 }}>
            Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : 'never'}
          </div>
        </div>
      </div>

      {syncResult && (
        <div style={{ background: syncResult.ok === false ? '#fee' : '#eef', padding: '0.75rem', borderRadius: 6, margin: '1rem 0' }}>
          {syncResult.ok === false ? (
            <span>Sync failed: {syncResult.error}</span>
          ) : (
            <span>
              Pushed {syncResult.pushed.categories} categories / {syncResult.pushed.notes} notes —
              Pulled {syncResult.pulled.categories} categories / {syncResult.pulled.notes} notes
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginTop: '1rem' }}>
        <section>
          <h2>Categories</h2>
          <form onSubmit={addCategory} style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category" style={{ flex: 1 }} />
            <button type="submit">Add</button>
          </form>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {categories.map((c) => (
              <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #eee' }}>
                {c.name}
                <button onClick={() => deleteCategory(c.id)} style={{ color: 'crimson' }}>✕</button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Notes</h2>
          <form onSubmit={addNote} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1rem' }}>
            <input
              value={newNote.title}
              onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              placeholder="Note title"
            />
            <textarea
              value={newNote.body}
              onChange={(e) => setNewNote({ ...newNote, body: e.target.value })}
              placeholder="Note body"
              rows={2}
            />
            <select value={newNote.category_id} onChange={(e) => setNewNote({ ...newNote, category_id: e.target.value })}>
              <option value="">(no category)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="submit">Add note</button>
          </form>

          <ul style={{ listStyle: 'none', padding: 0 }}>
            {notes.map((n) => (
              <li key={n.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{n.title}</strong>
                  <button onClick={() => deleteNote(n.id)} style={{ color: 'crimson' }}>✕</button>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#555' }}>{n.body}</div>
                <div style={{ fontSize: '0.75rem', color: '#999' }}>Category: {categoryName(n.category_id)}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
