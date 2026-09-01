const express = require('express');
const cors = require('cors');
const path = require('path');
const itemRoutes = require('./routes/item.routes');
const notFound = require('./middleware/not-found');
const errorHandler = require('./middleware/error-handler');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(path.resolve('uploads')));
  app.use('/api/items', itemRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
