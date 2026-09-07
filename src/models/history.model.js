const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  repairment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Repairment', default: null },
  fields: [{ field_name: { type: String, required: true }, from: { type: mongoose.Schema.Types.Mixed, default: null }, to: { type: mongoose.Schema.Types.Mixed } }],
  date: { type: Date, default: Date.now }
}, { collection: 'history' });
historySchema.index({ item_id: 1, date: 1 });

module.exports = mongoose.model('History', historySchema);
