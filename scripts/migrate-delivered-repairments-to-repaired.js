const mongoose = require("mongoose");
const env = require("../src/config/env");

async function migrateDeliveredRepairmentsToRepaired() {
    await mongoose.connect(env.mongodbUri);
    try {
        const repairments = mongoose.connection.collection("repairments");
        const result = await repairments.updateMany(
            {
                status: "delivered",
                $or: [{ repaired: { $ne: true } }, { golden: true }],
            },
            { $set: { repaired: true, golden: false } },
        );
        console.log(`Marked ${result.modifiedCount} delivered repairment(s) as repaired.`);
    } finally {
        await mongoose.disconnect();
    }
}

migrateDeliveredRepairmentsToRepaired().catch((error) => {
    console.error("Delivered-repairment migration failed:", error.message);
    process.exitCode = 1;
});
