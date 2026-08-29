const { normalizeInventoryState, snapshotInventoryState, isInventoryTransaction } = require('../../src/services/inventory-state');

test('stored state clears recipient', () => {
  expect(normalizeInventoryState({ stored: true, location: { warehouse: ' W ', section: 'S', pack: 'P' }, delivered_to: 'Lab' }))
    .toEqual({ stored: true, location: { warehouse: 'W', section: 'S', pack: 'P' }, delivered_to: '' });
});

test('delivered state clears location', () => {
  expect(normalizeInventoryState({ stored: false, location: { warehouse: 'W' }, delivered_to: ' Lab ' }))
    .toEqual({ stored: false, location: undefined, delivered_to: 'Lab' });
});

test('rejects incomplete stored location', () => {
  expect(() => normalizeInventoryState({ stored: true, location: { warehouse: 'W' } })).toThrow(/location/);
});

test('detects inventory transactions only', () => {
  const before = { stored: true, location: { warehouse: 'W', section: 'S', pack: 'P' } };
  expect(isInventoryTransaction(before, { ...before, name: 'Changed' })).toBe(false);
  expect(isInventoryTransaction(before, { ...before, location: { ...before.location, pack: 'P2' } })).toBe(true);
  expect(snapshotInventoryState({ stored: false, delivered_to: 'Lab' })).toBe('Lab');
});
