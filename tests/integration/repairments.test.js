const { test, before, after, afterEach } = require('node:test');
const { expect } = require('expect');
const request = require('supertest');
const { createApp } = require('../../src/app');
const Item = require('../../src/models/item.model');
const Repairment = require('../../src/models/repairment.model');
const History = require('../../src/models/history.model');
const { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } = require('../helpers/database');

before(connectTestDatabase);
afterEach(clearTestDatabase);
after(disconnectTestDatabase);

const app = createApp();

async function createItem(quantity = 1) {
  return request(app).post('/api/items').send({
    name: 'Repairable controller', stored: true, under_repairment: true, total_quantity: quantity,
    available_quantity: quantity,
    location: { warehouse: 'ignored', section: 'ignored', pack: 'ignored' },
  });
}

test('under-repair item is normalized to lab and gets one repairment per quantity', async () => {
  const response = await createItem(2);
  expect(response.status).toBe(201);
  expect(response.body.data.location).toEqual({ warehouse: 'lab', section: null, pack: null });
  expect(await Repairment.countDocuments({ item_id: response.body.data._id, deleted: false })).toBe(2);
});

test('stored items get golden unit records and golden does not count as repairment', async () => {
  const response = await request(app).post('/api/items').send({ name: 'Stock controller', stored: true, total_quantity: 2, location: { warehouse: 'W' } });
  expect(response.status).toBe(201);
  const rows = await Repairment.find({ item_id: response.body.data._id, deleted: false });
  expect(rows).toHaveLength(2);
  expect(rows.every((row) => row.status === 'golden')).toBe(true);
  expect(rows.filter((row) => row.status !== 'golden')).toHaveLength(0);
});

test('repairment updates increment item count and record linked field history', async () => {
  const item = await Item.create({ name: 'Controller', stored: true, location: { warehouse: 'W', section: 'S', pack: 'P' } });
  const created = await request(app).post(`/api/repairments/item/${item._id}`).send({ status: 'repairing', spare_part: [{ part: 'R1', price: 2 }] });
  const updated = await request(app).patch(`/api/repairments/${created.body.data._id}`).send({ status: 'repaired' });
  expect(updated.status).toBe(200);
  expect((await Item.findById(item._id)).edit_count).toBe(2);
  expect(await History.exists({ item_id: item._id, repairment_id: created.body.data._id, 'fields.field_name': 'status' })).toBeTruthy();
});

test('adding a repairment increases total quantity and available quantity by one', async () => {
  const item = await Item.create({ name: 'Controller', stored: true, location: { warehouse: 'W', section: 'S', pack: 'P' }, total_quantity: 3, available_quantity: 2 });

  const created = await request(app).post(`/api/repairments/item/${item._id}`).send({ status: 'repairing' });

  expect(created.status).toBe(201);
  expect((await Item.findById(item._id)).toObject()).toMatchObject({ total_quantity: 4, available_quantity: 3 });
});

test('adding an already delivered repairment increases total quantity but keeps availability unchanged', async () => {
  const item = await Item.create({ name: 'Controller', stored: true, location: { warehouse: 'W', section: 'S', pack: 'P' }, total_quantity: 3, available_quantity: 2 });

  const created = await request(app).post(`/api/repairments/item/${item._id}`).send({ status: 'delivered', delivered_to: 'Assembly' });

  expect(created.status).toBe(201);
  expect((await Item.findById(item._id)).toObject()).toMatchObject({ total_quantity: 4, available_quantity: 2 });
});

test('adding an already delivered repairment does not make an unavailable item negative', async () => {
  const item = await Item.create({ name: 'Controller', stored: true, location: { warehouse: 'W', section: 'S', pack: 'P' }, total_quantity: 3, available_quantity: 0 });

  const created = await request(app).post(`/api/repairments/item/${item._id}`).send({ status: 'delivered', delivered_to: 'Assembly' });

  expect(created.status).toBe(201);
  expect((await Item.findById(item._id)).toObject()).toMatchObject({ total_quantity: 4, available_quantity: 0 });
});

test('editing a repairment serial number persists it and records the change', async () => {
  const item = await Item.create({ name: 'Controller', stored: true, location: { warehouse: 'W' } });
  const created = await request(app).post(`/api/repairments/item/${item._id}`).send({ status: 'repairing', serial_num: 'SN-OLD' });

  const updated = await request(app).patch(`/api/repairments/${created.body.data._id}`).send({ serial_num: 'SN-NEW' });

  expect(updated.status).toBe(200);
  expect(updated.body.data.serial_num).toBe('SN-NEW');
  expect((await request(app).get(`/api/repairments/${created.body.data._id}`)).body.data.serial_num).toBe('SN-NEW');
  expect(await History.exists({ item_id: item._id, repairment_id: created.body.data._id, 'fields.field_name': 'serial_num', 'fields.to': 'SN-NEW' })).toBeTruthy();
});

test('allows delivery from any repairment state and keeps the parent under repair until all units are delivered', async () => {
  const response = await createItem(2);
  const repairments = await Repairment.find({ item_id: response.body.data._id }).sort({ createdAt: 1 });

  const first = await request(app).patch(`/api/repairments/${repairments[0]._id}`).send({
    status: 'delivered', delivered_to: 'Assembly', delivered_by: 'Karim',
  });
  expect(first.status).toBe(200);
  expect(first.body.data).toMatchObject({ status: 'delivered', delivered_to: 'Assembly', delivered_by: 'Karim' });
  expect((await Item.findById(response.body.data._id)).under_repairment).toBe(true);

  const second = await request(app).patch(`/api/repairments/${repairments[1]._id}`).send({
    status: 'delivered', delivered_to: 'Assembly', delivered_by: 'Karim',
  });
  expect(second.status).toBe(200);
  expect((await Item.findById(response.body.data._id)).toObject()).toMatchObject({
    stored: false, under_repairment: false, delivered_to: 'Assembly',
  });
});

test('delivering a golden unit decreases availability without counting it as repairment', async () => {
  const item = await Item.create({ name: 'Stored controller', stored: true, location: { warehouse: 'W' }, total_quantity: 2, available_quantity: 2 });
  const unit = await Repairment.create({ item_id: item._id, status: 'golden' });
  const response = await request(app).patch(`/api/repairments/${unit._id}`).send({ status: 'delivered', delivered_to: 'Assembly' });
  expect(response.status).toBe(200);
  expect((await Item.findById(item._id)).toObject()).toMatchObject({ total_quantity: 2, available_quantity: 1, stored: true });
});

test('delivering the last golden unit delivers the parent item', async () => {
  const item = await Item.create({ name: 'Stored controller', stored: true, location: { warehouse: 'W' }, total_quantity: 1, available_quantity: 1 });
  const unit = await Repairment.create({ item_id: item._id, status: 'golden' });
  const response = await request(app).patch(`/api/repairments/${unit._id}`).send({ status: 'delivered', delivered_to: 'Assembly' });
  expect(response.status).toBe(200);
  expect((await Item.findById(item._id)).toObject()).toMatchObject({ stored: false, available_quantity: 0, delivered_to: 'Assembly' });
});

test('delivering a golden unit does not clear an outstanding repair queue', async () => {
  const item = await Item.create({ name: 'Mixed stock controller', stored: true, under_repairment: true, location: { warehouse: 'lab', section: null, pack: null }, total_quantity: 2, available_quantity: 2 });
  const golden = await Repairment.create({ item_id: item._id, status: 'golden' });
  await Repairment.create({ item_id: item._id, status: 'repairing' });
  const response = await request(app).patch(`/api/repairments/${golden._id}`).send({ status: 'delivered', delivered_to: 'Assembly' });
  expect(response.status).toBe(200);
  expect((await Item.findById(item._id)).toObject()).toMatchObject({ stored: true, under_repairment: true, available_quantity: 1 });
});

test('repairment update notes are persisted', async () => {
  const item = await Item.create({ name: 'Controller', stored: true, location: { warehouse: 'W', section: 'S', pack: 'P' } });
  const created = await request(app).post(`/api/repairments/item/${item._id}`).send({ status: 'repairing' });
  const updated = await request(app).patch(`/api/repairments/${created.body.data._id}`).send({ updates: [{ text: 'Replaced regulator' }] });

  expect(updated.status).toBe(200);
  expect(updated.body.data.updates).toEqual(expect.arrayContaining([expect.objectContaining({ text: 'Replaced regulator' })]));
  const second = await request(app).patch(`/api/repairments/${created.body.data._id}`).send({ updates: [{ text: 'Verified output' }] });
  expect(second.body.data.updates).toEqual(expect.arrayContaining([
    expect.objectContaining({ text: 'Replaced regulator' }),
    expect.objectContaining({ text: 'Verified output' })
  ]));
});

test('repairment soft delete is hidden and cannot be repeated', async () => {
  const item = await Item.create({ name: 'Controller', stored: true, location: { warehouse: 'W', section: 'S', pack: 'P' } });
  const created = await request(app).post(`/api/repairments/item/${item._id}`).send({ status: 'repairing' });
  expect((await request(app).delete(`/api/repairments/${created.body.data._id}`)).status).toBe(200);
  expect((await request(app).get(`/api/repairments/item/${item._id}`)).body.data).toHaveLength(0);
  expect((await request(app).delete(`/api/repairments/${created.body.data._id}`)).status).toBe(409);
});
