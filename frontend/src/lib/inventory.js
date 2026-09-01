import { assetUrl } from './config';

export function normalizeSearch(value) {
  return String(value ?? '').trim().toLocaleLowerCase();
}

export function filterItems(items, criteria = {}) {
  const query = normalizeSearch(criteria.query);
  const status = criteria.status || 'all';
  const category = normalizeSearch(criteria.category);
  const warehouse = normalizeSearch(criteria.warehouse);
  const tag = normalizeSearch(criteria.tag);

  return items.filter((item) => {
    const searchable = [item.name, item.part_num, item.description, item.owner, ...(item.tags || [])]
      .map(normalizeSearch)
      .join(' ');
    if (query && !searchable.includes(query)) return false;
    if (status === 'stored' && !item.stored) return false;
    if (status === 'delivered' && item.stored) return false;
    if (category && normalizeSearch(item.category) !== category) return false;
    if (warehouse && normalizeSearch(item.location?.warehouse) !== warehouse) return false;
    if (tag && !(item.tags || []).some((value) => normalizeSearch(value) === tag)) return false;
    return true;
  });
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

export function uniqueFilterOptions(items) {
  return {
    categories: sortedUnique(items.map((item) => item.category)),
    warehouses: sortedUnique(items.map((item) => item.location?.warehouse)),
    tags: sortedUnique(items.flatMap((item) => item.tags || []))
  };
}

export function formatLocation(item) {
  if (!item?.stored) return item?.delivered_to || '—';
  return [item.location?.warehouse, item.location?.section, item.location?.pack].filter(Boolean).join(' / ') || '—';
}

export function primaryImage(item) {
  return assetUrl(item?.images?.[0]?.path || '');
}
