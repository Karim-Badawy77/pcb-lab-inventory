const mongoose = require("mongoose");
const env = require("../src/config/env");

async function migrateRepairmentRepairedBoolean() {
    await mongoose.connect(env.mongodbUri);
    try {
        const repairments = mongoose.connection.collection("repairments");
        const result = await repairments.updateMany(
            { status: "repaired" },
            { $set: { status: "repairing", repaired: true } },
        );
        console.log(`Migrated ${result.modifiedCount} repairment(s) to the repaired boolean.`);
    } finally {
        await mongoose.disconnect();
    }
}

migrateRepairmentRepairedBoolean().catch((error) => {
    console.error("Repairment repaired-boolean migration failed:", error.message);
    process.exitCode = 1;
});
