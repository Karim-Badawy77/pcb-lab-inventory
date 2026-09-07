const ApiError = require('../utils/api-error');

function normalizeInventoryState(candidate) {
  const stored = candidate.stored;
  if (typeof stored !== 'boolean') throw new ApiError(400, 'stored must be a boolean');
  if (stored) {
    if (candidate.under_repairment) return { stored: true, location: { warehouse: 'lab', section: null, pack: null }, delivered_to: '' };
    const location = Object.fromEntries(['warehouse', 'section', 'pack'].map((key) => [key, candidate.location?.[key]?.trim()]));
    if (Object.values(location).some((value) => !value)) throw new ApiError(400, 'A complete location is required for stored items');
    return { stored: true, location, delivered_to: '' };
  }
  const deliveredTo = candidate.delivered_to?.trim();
  if (!deliveredTo) throw new ApiError(400, 'delivered_to is required for delivered items');
  return { stored: false, location: undefined, delivered_to: deliveredTo };
}

function snapshotInventoryState(item) {
  if (!item) return null;
  if (!item.stored) return item.delivered_to || null;
  return { warehouse: item.location?.warehouse, section: item.location?.section, pack: item.location?.pack };
}

function isInventoryTransaction(before, after) {
  const left = snapshotInventoryState(before);
  const right = snapshotInventoryState(after);
  if (typeof left !== typeof right) return true;
  if (typeof left === 'string' || left === null || right === null) return left !== right;
  return ['warehouse', 'section', 'pack'].some((key) => left[key] !== right[key]);
}

module.exports = { normalizeInventoryState, snapshotInventoryState, isInventoryTransaction };
