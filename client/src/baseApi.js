export const API_BASE = import.meta.env.DEV
  ? '/local-server'                 // dev: goes through Vite proxy → LOCAL_API_URL/api/*
  : 'http://localhost:3001/api';    // prod: hits Express directly, already at /api

export function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
}