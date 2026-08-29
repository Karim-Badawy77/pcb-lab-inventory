const env = require('./config/env');
const { connectDatabase } = require('./config/database');
const { createApp } = require('./app');

async function start() {
  await connectDatabase(env.mongodbUri);
  createApp().listen(env.port, () => console.log(`Inventory API listening on port ${env.port}`));
}

start().catch((error) => {
  console.error('Failed to start inventory API:', error.message);
  process.exitCode = 1;
});
