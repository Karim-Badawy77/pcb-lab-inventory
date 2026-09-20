export function apiBaseUrl() {
  return '';
}

export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = `/${String(path || '').replace(/^\/+/, '')}`;
  return `${apiBaseUrl()}${normalizedPath}`;
}

export function assetUrl(path) {
  if (!path) return '';
  return apiUrl(path);
}
