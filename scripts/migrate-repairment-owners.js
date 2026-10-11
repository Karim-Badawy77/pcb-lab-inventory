const mongoose = require("mongoose");
const env = require("../src/config/env");

async function migrateRepairmentOwners() {
    await mongoose.connect(env.mongodbUri);
    try {
        const items = mongoose.connection.collection("items");
        const repairments = mongoose.connection.collection("repairments");
        const cursor = items
            .find({ owner: { $type: "string", $ne: "" } })
            .project({ _id: 1, owner: 1 });
        let migrated = 0;
        for await (const item of cursor) {
            const result = await repairments.updateMany(
                {
                    item_id: item._id,
                    $or: [
                        { owner: { $exists: false } },
                        { owner: null },
                        { owner: "" },
                    ],
                },
                { $set: { owner: item.owner } },
            );
            migrated += result.modifiedCount;
        }
        console.log(`Copied legacy item owners to ${migrated} repairment(s).`);
    } finally {
        await mongoose.disconnect();
    }
}

migrateRepairmentOwners().catch((error) => {
    console.error("Repairment owner migration failed:", error.message);
    process.exitCode = 1;
});
