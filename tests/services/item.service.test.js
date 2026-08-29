const History = require('../../src/models/history.model');
const { createItem, updateItem, getItem, listItems, softDeleteItem } = require('../../src/services/item.service');
const { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } = require('../helpers/database');

jest.setTimeout(300000);
beforeAll(connectTestDatabase);
afterEach(clearTestDatabase);
afterAll(disconnectTestDatabase);

const storedItem = {
  name: 'Controller', part_num: 'C-1', stored: true,
  location: { warehouse: 'W1', section: 'S1', pack: 'P1' }, tags: ['pcb']
};

test('creation writes initial transaction history', async () => {
  const item = await createItem(storedItem, []);
  const rows = await History.find({ item_id: item._id }).lean();
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ from: null, to: storedItem.location, new_item: true });
});

test('metadata update writes no history but location move does', async () => {
  const item = await createItem(storedItem, []);
  await updateItem(item._id, { description: 'Edited' }, []);
  expect(await History.countDocuments({ item_id: item._id })).toBe(1);
  await updateItem(item._id, { location: { warehouse: 'W1', section: 'S1', pack: 'P2' } }, []);
  const rows = await History.find({ item_id: item._id }).sort({ date: 1 }).lean();
  expect(rows).toHaveLength(2);
  expect(rows[1]).toMatchObject({ from: storedItem.location, to: { warehouse: 'W1', section: 'S1', pack: 'P2' } });
});

test('delivery clears location and records recipient', async () => {
  const item = await createItem(storedItem, []);
  const updated = await updateItem(item._id, { stored: false, delivered_to: 'Assembly Lab' }, []);
  expect(updated.location).toBeUndefined();
  expect(updated.delivered_to).toBe('Assembly Lab');
});

test('soft deletion hides item and records deleted marker', async () => {
  const item = await createItem(storedItem, []);
  await softDeleteItem(item._id);
  await expect(getItem(item._id)).rejects.toMatchObject({ statusCode: 404 });
  expect((await listItems({ includeDeleted: true })).total).toBe(1);
  expect(await History.exists({ item_id: item._id, to: 'deleted' })).toBeTruthy();
  await expect(softDeleteItem(item._id)).rejects.toMatchObject({ statusCode: 409 });
});
