const mongoose = require('mongoose');

const sparePartSchema = new mongoose.Schema({
  part: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
}, { _id: false });
const updateSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

const repairmentSchema = new mongoose.Schema({
  item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  serial_num: { type: String, trim: true },
  status: { type: String, enum: ['repaired', 'unrepairable', 'repairing', 'awaiting_spare_part'], required: true },
  field_test_date: { type: [Date], default: [] },
  repairer: { type: [String], default: [] },
  spare_part: { type: [sparePartSchema], default: [] },
  updates: { type: [updateSchema], default: [] },
  deleted: { type: Boolean, default: false },
}, { collection: 'repairments', timestamps: true });

repairmentSchema.index({ item_id: 1, deleted: 1, createdAt: 1 });

module.exports = mongoose.model('Repairment', repairmentSchema);
