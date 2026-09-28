const mongoose = require('mongoose');
const env = require('../src/config/env');

async function migrateQuantities() {
  await mongoose.connect(env.mongodbUri);
  try {
    const result = await mongoose.connection.collection('items').updateMany(
      {
        $or: [
          { total_quantity: { $exists: false } },
          { available_quantity: { $exists: false } },
        ],
      },
      [
        {
          $set: {
            total_quantity: { $ifNull: ['$total_quantity', { $ifNull: ['$quantity', 1] }] },
            available_quantity: { $ifNull: ['$available_quantity', { $ifNull: ['$total_quantity', { $ifNull: ['$quantity', 1] }] }] },
          },
        },
      ],
    );
    console.log(`Migrated quantities on ${result.modifiedCount} item(s).`);
  } finally {
    await mongoose.disconnect();
  }
}

migrateQuantities().catch((error) => {
  console.error('Quantity migration failed:', error.message);
  process.exitCode = 1;
});
