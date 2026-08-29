const request = require('supertest');
const { createApp } = require('../../src/app');
const { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } = require('../helpers/database');

jest.setTimeout(300000);
beforeAll(connectTestDatabase);
afterEach(clearTestDatabase);
afterAll(disconnectTestDatabase);

const app = createApp();

async function createStoredItem() {
  return request(app).post('/api/items')
    .field('name', 'Controller').field('part_num', 'C-1').field('stored', 'true')
    .field('location', JSON.stringify({ warehouse: 'W', section: 'S', pack: 'P' }));
}

test('creates an item with multiple optional images and returns history', async () => {
  const response = await request(app).post('/api/items')
    .field('name', 'Controller').field('part_num', 'C-1').field('stored', 'true')
    .field('location', JSON.stringify({ warehouse: 'W', section: 'S', pack: 'P' }))
    .attach('images', Buffer.from('front'), { filename: 'front.png', contentType: 'image/png' })
    .attach('images', Buffer.from('back'), { filename: 'back.png', contentType: 'image/png' });
  expect(response.status).toBe(201);
  expect(response.body.data.images).toHaveLength(2);
  const detail = await request(app).get(`/api/items/${response.body.data._id}`);
  expect(detail.body.data.history).toHaveLength(1);
});

test('lists, updates delivery state, and soft deletes', async () => {
  const created = await createStoredItem();
  const id = created.body.data._id;
  expect((await request(app).get('/api/items')).body.data.total).toBe(1);
  const delivered = await request(app).patch(`/api/items/${id}`).send({ stored: false, delivered_to: 'Lab' });
  expect(delivered.body.data).toMatchObject({ stored: false, delivered_to: 'Lab' });
  expect((await request(app).delete(`/api/items/${id}`)).status).toBe(200);
  expect((await request(app).get('/api/items')).body.data.total).toBe(0);
  expect((await request(app).get('/api/items?includeDeleted=true')).body.data.total).toBe(1);
});

test('returns validation errors in stable envelope', async () => {
  const response = await request(app).post('/api/items').send({ name: 'Bad', stored: false });
  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({ success: false });
});

test('removes one image by its subdocument id', async () => {
  const created = await request(app).post('/api/items')
    .field('name', 'Controller').field('part_num', 'C-1').field('stored', 'false').field('delivered_to', 'Lab')
    .attach('images', Buffer.from('one'), { filename: 'one.png', contentType: 'image/png' })
    .attach('images', Buffer.from('two'), { filename: 'two.png', contentType: 'image/png' });
  const removeId = created.body.data.images[0]._id;
  const updated = await request(app).patch(`/api/items/${created.body.data._id}`)
    .field('removeImageIds', JSON.stringify([removeId]));
  expect(updated.status).toBe(200);
  expect(updated.body.data.images).toHaveLength(1);
});

test('rejects unsupported image types', async () => {
  const response = await request(app).post('/api/items')
    .field('name', 'Controller').field('part_num', 'C-1').field('stored', 'false').field('delivered_to', 'Lab')
    .attach('images', Buffer.from('text'), { filename: 'notes.txt', contentType: 'text/plain' });
  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});
