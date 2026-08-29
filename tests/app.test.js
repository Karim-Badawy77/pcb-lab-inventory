const request = require('supertest');
const { createApp } = require('../src/app');

test('unknown routes use the stable error envelope', async () => {
  const response = await request(createApp()).get('/missing');

  expect(response.status).toBe(404);
  expect(response.body).toEqual({ success: false, message: 'Route not found' });
});
