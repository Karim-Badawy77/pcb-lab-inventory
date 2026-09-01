const express = require('express');
const path = require('path');
const itemRoutes = require('./routes/item.routes');
const notFound = require('./middleware/not-found');
const errorHandler = require('./middleware/error-handler');

function createApp({ frontendDir = path.resolve('public') } = {}) {
  const app = express();
  app.use(express.json());
  app.use('/uploads', express.static(path.resolve('uploads')));
  app.use('/api/items', itemRoutes);
  app.use(express.static(frontendDir));
  app.get(/^(?!\/api(?:\/|$)|\/uploads(?:\/|$)).*/, (req, res, next) => {
    res.sendFile(path.join(frontendDir, 'index.html'), (error) => {
      if (error) next();
    });
  });
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
