const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
    {
        item_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Item",
            required: true,
        },
        date: { type: Date, default: Date.now },
        from: { type: mongoose.Schema.Types.Mixed, default: null },
        to: { type: mongoose.Schema.Types.Mixed, required: true },
        delivered_to: { type: String, trim: true },
        new_item: { type: Boolean, default: false },
    },
    { collection: "history" },
);
historySchema.index({ item_id: 1, date: 1 });

module.exports = mongoose.model("History", historySchema);
