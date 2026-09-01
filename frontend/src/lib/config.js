export function apiBaseUrl() {
  return String(window.APP_CONFIG?.API_BASE_URL || '').trim().replace(/\/+$/, '');
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
