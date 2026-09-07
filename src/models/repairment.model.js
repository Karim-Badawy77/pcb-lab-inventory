const mongoose = require('mongoose');

const sparePartSchema = new mongoose.Schema({
  part: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
}, { _id: false });

const repairmentSchema = new mongoose.Schema({
  item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  status: { type: String, enum: ['repaired', 'unrepairable', 'repairing', 'awaiting_spare_part'], required: true },
  field_test_date: { type: [Date], default: [] },
  repairer: { type: [String], default: [] },
  spare_part: { type: [sparePartSchema], default: [] },
  deleted: { type: Boolean, default: false },
}, { collection: 'repairments', timestamps: true });

repairmentSchema.index({ item_id: 1, deleted: 1, createdAt: 1 });

module.exports = mongoose.model('Repairment', repairmentSchema);
