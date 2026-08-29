const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replicaSet;

async function connectTestDatabase() {
  if (process.env.TEST_MONGODB_URI) {
    await mongoose.connect(process.env.TEST_MONGODB_URI);
    return;
  }
  replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replicaSet.getUri('pcb-inventory'));
}

async function clearTestDatabase() {
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
}

async function disconnectTestDatabase() {
  await mongoose.disconnect();
  if (replicaSet) await replicaSet.stop();
}

module.exports = { connectTestDatabase, clearTestDatabase, disconnectTestDatabase };
