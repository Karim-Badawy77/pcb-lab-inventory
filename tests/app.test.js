const request = require('supertest');
const { createApp } = require('../src/app');

test('unknown routes use the stable error envelope', async () => {
  const response = await request(createApp()).get('/missing');

  expect(response.status).toBe(404);
  expect(response.body).toEqual({ success: false, message: 'Route not found' });
});

test('allows any CORS origin and handles preflight', async () => {
  const app = createApp();
  const response = await request(app).get('/missing').set('Origin', 'https://frontend.example.test');
  expect(response.headers['access-control-allow-origin']).toBe('*');

  const preflight = await request(app).options('/api/items')
    .set('Origin', 'https://another.example.test')
    .set('Access-Control-Request-Method', 'POST');
  expect(preflight.status).toBe(204);
  expect(preflight.headers['access-control-allow-origin']).toBe('*');
});

test('does not serve frontend routes', async () => {
  const response = await request(createApp()).get('/items/new');
  expect(response.status).toBe(404);
  expect(response.type).toMatch(/json/);
  expect(response.body).toEqual({ success: false, message: 'Route not found' });
});
