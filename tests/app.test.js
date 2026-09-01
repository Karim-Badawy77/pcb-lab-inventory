const request = require('supertest');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createApp } = require('../src/app');

test('unknown routes use the stable error envelope', async () => {
  const response = await request(createApp()).get('/missing');

  expect(response.status).toBe(404);
  expect(response.body).toEqual({ success: false, message: 'Route not found' });
});

test('serves frontend assets and SPA routes without swallowing API 404s', async () => {
  const frontendDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pcb-frontend-'));
  await fs.writeFile(path.join(frontendDir, 'index.html'), '<main id="app">PCB Inventory</main>');
  await fs.writeFile(path.join(frontendDir, 'app.css'), 'body{color:green}');
  const hostedApp = createApp({ frontendDir });

  expect((await request(hostedApp).get('/app.css')).text).toContain('color:green');
  expect((await request(hostedApp).get('/items/new')).text).toContain('PCB Inventory');
  expect((await request(hostedApp).get('/items/507f1f77bcf86cd799439011')).text).toContain('PCB Inventory');
  const api404 = await request(hostedApp).get('/api/missing');
  expect(api404.status).toBe(404);
  expect(api404.body).toMatchObject({ success: false });
});
