const mongoose = require('mongoose');
const Item = require('../../src/models/item.model');
const History = require('../../src/models/history.model');

test('stored item accepts a complete location', async () => {
  const item = new Item({ name: 'PCB', part_num: 'P-1', stored: true,
    location: { warehouse: 'W1', section: 'S1', pack: 'P1' } });
  await expect(item.validate()).resolves.toBeUndefined();
  expect(item.deleted).toBe(false);
});

test('delivered item requires delivered_to', async () => {
  const item = new Item({ name: 'PCB', part_num: 'P-1', stored: false });
  await expect(item.validate()).rejects.toThrow(/delivered_to/);
});

test('image and update records receive ids', () => {
  const item = new Item({ name: 'PCB', part_num: 'P-1', stored: false, delivered_to: 'Lab',
    images: [{ path: '/uploads/a.png', originalName: 'a.png' }],
    updates: [{ text: 'Checked' }] });
  expect(item.images[0]._id).toBeDefined();
  expect(item.updates[0]._id).toBeDefined();
});

test('history accepts the deleted marker', async () => {
  const history = new History({ item_id: new mongoose.Types.ObjectId(), from: { warehouse: 'W1' }, to: 'deleted' });
  await expect(history.validate()).resolves.toBeUndefined();
});
