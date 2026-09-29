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

    const items = mongoose.connection.collection('items');
    const repairments = mongoose.connection.collection('repairments');
    const functionalItems = await items.find({ functional: true }).project({ _id: 1, total_quantity: 1, quantity: 1 }).toArray();
    for (const item of functionalItems) {
      const existing = await repairments.countDocuments({ item_id: item._id, deleted: { $ne: true } });
      const unitCount = item.total_quantity || item.quantity || 1;
      for (let index = existing; index < unitCount; index += 1) {
        await repairments.insertOne({ item_id: item._id, status: 'golden', deleted: false, field_test_date: [], repairer: [], spare_part: [], updates: [], createdAt: new Date(), updatedAt: new Date() });
      }
    }
    const removedFunctional = await items.updateMany({}, { $unset: { functional: '' } });
    console.log(`Converted ${functionalItems.length} functional item(s) to golden unit records and removed functional from ${removedFunctional.modifiedCount} item(s).`);
  } finally {
    await mongoose.disconnect();
  }
}

migrateQuantities().catch((error) => {
  console.error('Quantity migration failed:', error.message);
  process.exitCode = 1;
});
