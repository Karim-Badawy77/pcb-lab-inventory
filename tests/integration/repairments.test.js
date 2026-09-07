const request = require('supertest');
const { createApp } = require('../../src/app');
const Item = require('../../src/models/item.model');
const Repairment = require('../../src/models/repairment.model');
const History = require('../../src/models/history.model');
const { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } = require('../helpers/database');

jest.setTimeout(300000);
beforeAll(connectTestDatabase);
afterEach(clearTestDatabase);
afterAll(disconnectTestDatabase);

const app = createApp();

async function createItem(quantity = 1) {
  return request(app).post('/api/items').send({
    name: 'Repairable controller', stored: true, under_repairment: true, quantity,
    location: { warehouse: 'ignored', section: 'ignored', pack: 'ignored' },
  });
}

test('under-repair item is normalized to lab and gets one repairment per quantity', async () => {
  const response = await createItem(2);
  expect(response.status).toBe(201);
  expect(response.body.data.location).toEqual({ warehouse: 'lab', section: null, pack: null });
  expect(await Repairment.countDocuments({ item_id: response.body.data._id, deleted: false })).toBe(2);
});

test('repairment updates increment item count and record linked field history', async () => {
  const item = await Item.create({ name: 'Controller', stored: true, location: { warehouse: 'W', section: 'S', pack: 'P' } });
  const created = await request(app).post(`/api/repairments/item/${item._id}`).send({ status: 'repairing', spare_part: [{ part: 'R1', price: 2 }] });
  const updated = await request(app).patch(`/api/repairments/${created.body.data._id}`).send({ status: 'repaired' });
  expect(updated.status).toBe(200);
  expect((await Item.findById(item._id)).edit_count).toBe(2);
  expect(await History.exists({ item_id: item._id, repairment_id: created.body.data._id, 'fields.field_name': 'status' })).toBeTruthy();
});

test('repairment soft delete is hidden and cannot be repeated', async () => {
  const item = await Item.create({ name: 'Controller', stored: true, location: { warehouse: 'W', section: 'S', pack: 'P' } });
  const created = await request(app).post(`/api/repairments/item/${item._id}`).send({ status: 'repairing' });
  expect((await request(app).delete(`/api/repairments/${created.body.data._id}`)).status).toBe(200);
  expect((await request(app).get(`/api/repairments/item/${item._id}`)).body.data).toHaveLength(0);
  expect((await request(app).delete(`/api/repairments/${created.body.data._id}`)).status).toBe(409);
});
