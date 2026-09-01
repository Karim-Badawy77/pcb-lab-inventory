import { apiUrl } from './config';

export async function apiRequest(path, options = {}, fetchImpl = fetch) {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetchImpl(apiUrl(path), { ...options, headers });
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || body?.success === false) {
    throw new Error(body?.message || 'Request failed');
  }
  return body?.data;
}

export async function fetchAllItems(fetchImpl = fetch) {
  const allItems = [];
  let page = 1;

  while (true) {
    const data = await apiRequest(`/api/items?page=${page}&limit=100`, {}, fetchImpl);
    const pageItems = Array.isArray(data?.items) ? data.items : [];
    allItems.push(...pageItems);
    if (pageItems.length === 0 || allItems.length >= Number(data?.total || 0)) break;
    page += 1;
  }

  return allItems;
}
