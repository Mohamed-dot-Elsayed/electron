// client/src/apiBase.js
const API_BASE = import.meta.env.DEV
  ? ''                              // dev: relative, Vite proxy picks it up
  : 'http://localhost:3001';        // prod: hit Express directly

export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const rewritten = normalized.replace(/^\/local-server/, '/api');
  return `${API_BASE}${rewritten}`;
}