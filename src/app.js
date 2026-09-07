const express = require('express');
const cors = require('cors');
const path = require('path');
const itemRoutes = require('./routes/item.routes');
const repairmentRoutes = require('./routes/repairment.routes');
const notFound = require('./middleware/not-found');
const errorHandler = require('./middleware/error-handler');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(path.resolve('uploads')));
  app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));
  app.use('/api/items', itemRoutes);
  app.use('/api/repairments', repairmentRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
