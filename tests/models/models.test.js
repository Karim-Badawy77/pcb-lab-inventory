const mongoose = require('mongoose');
const Item = require('../../src/models/item.model');
const History = require('../../src/models/history.model');
const Repairment = require('../../src/models/repairment.model');

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
  const history = new History({ item_id: new mongoose.Types.ObjectId(), fields: [{ field_name: 'deleted', from: null, to: true }] });
  await expect(history.validate()).resolves.toBeUndefined();
});

test('stage 2 item fields have defaults and validation', async () => {
  const item = new Item({ name: 'PCB', stored: false, delivered_to: 'Lab' });
  await expect(item.validate()).resolves.toBeUndefined();
  expect(item.part_num).toBeUndefined();
  expect(item.serial_num).toEqual([]);
  expect(item.functional).toBe(false);
  expect(item.under_repairment).toBe(false);
  expect(item.edit_count).toBe(0);
  expect(item.quantity).toBe(1);
  await expect(new Item({ name: 'x', stored: false, delivered_to: 'Lab', type: 'bad' }).validate()).rejects.toThrow();
});

test('repairment validates status and structured spare parts', async () => {
  const repairment = new Repairment({
    item_id: new mongoose.Types.ObjectId(),
    status: 'repairing',
    field_test_date: [new Date()],
    repairer: ['Ada'],
    spare_part: [{ part: 'R1', price: 2.5 }],
  });
  await expect(repairment.validate()).resolves.toBeUndefined();
  expect(repairment.deleted).toBe(false);
  await expect(new Repairment({ item_id: repairment.item_id, status: 'bad' }).validate()).rejects.toThrow();
});
