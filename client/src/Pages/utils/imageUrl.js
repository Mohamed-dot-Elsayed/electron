const LOCAL_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * Resolves any stored image field value into something an <img src=""> can use.
 * Handles:
 *  - real remote URLs (https://...)      -> rewritten to local route
 *  - already-local paths (/uploads/...)  -> prefixed with local base
 *  - local:// pending markers            -> reserved for future offline creation (not used yet)
 *  - inline base64 data                  -> passed straight through as a data URL
 *  - null/empty/malformed                -> null (caller shows a placeholder)
 */

function joinUrl(base, path) {
  const cleanBase = base.replace(/\/+$/, "");   // strip trailing slashes from base
  const cleanPath = path.replace(/^\/+/, "");   // strip leading slashes from path
  return `${cleanBase}/${cleanPath}`;
}

export function resolveImageUrl(value) {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("data:")) {
    return trimmed;
  }

  if (looksLikeRawBase64(trimmed)) {
    return `data:image/jpeg;base64,${trimmed}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const { pathname } = new URL(trimmed);
      return joinUrl(LOCAL_BASE, normalizePath(pathname));
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith("/") || trimmed.startsWith("uploads/")) {
    return joinUrl(LOCAL_BASE, normalizePath(trimmed));
  }

  if (trimmed.startsWith("local://pending/")) {
    return null;
  }

  return null;
}

function normalizePath(p) {
  const withLeadingSlash = p.startsWith("/") ? p : `/${p}`;
  return withLeadingSlash.replace(/^\/uploads\/uploads\//, "/uploads/");
}

function looksLikeRawBase64(str) {
  if (str.length < 100) return false; // real URLs are short; base64 image data is long
  if (/^https?:\/\//i.test(str)) return false;
  if (str.includes("/") && str.includes(".") && str.length < 300) return false; // likely a path, not base64
  return /^[A-Za-z0-9+/=]+$/.test(str.slice(0, 200)); // sample check, avoid scanning huge strings fully
}