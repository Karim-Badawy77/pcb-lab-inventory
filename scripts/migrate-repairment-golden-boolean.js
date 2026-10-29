const mongoose = require("mongoose");
const env = require("../src/config/env");

async function migrateRepairmentGoldenBoolean() {
    await mongoose.connect(env.mongodbUri);
    try {
        const repairments = mongoose.connection.collection("repairments");
        const result = await repairments.updateMany(
            { status: "golden" },
            { $set: { status: "repairing", golden: true } },
        );
        console.log(`Migrated ${result.modifiedCount} repairment(s) to the golden boolean.`);
    } finally {
        await mongoose.disconnect();
    }
}

migrateRepairmentGoldenBoolean().catch((error) => {
    console.error("Repairment golden-boolean migration failed:", error.message);
    process.exitCode = 1;
});
