const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  warehouse: { type: String, trim: true }, section: { type: String, trim: true }, pack: { type: String, trim: true }
}, { _id: false });
const imageSchema = new mongoose.Schema({
  path: { type: String, required: true }, originalName: { type: String, required: true }, uploadedAt: { type: Date, default: Date.now }
});
const updateSchema = new mongoose.Schema({ text: { type: String, required: true, trim: true }, createdAt: { type: Date, default: Date.now } });

const itemSchema = new mongoose.Schema({
  images: { type: [imageSchema], default: [] },
  stored: { type: Boolean, required: true }, deleted: { type: Boolean, default: false },
  location: { type: locationSchema }, owner: { type: String, trim: true }, organization: { type: String, trim: true },
  serial_num: { type: [String], default: [] }, functional: { type: Boolean, default: false },
  under_repairment: { type: Boolean, default: false },
  type: { type: String, enum: ['pcb', 'module', 'else'] }, edit_count: { type: Number, default: 0, min: 0 },
  quantity: { type: Number, default: 1, min: 1, validate: Number.isInteger },
  description: { type: String, trim: true }, tags: { type: [String], default: [] }, updates: { type: [updateSchema], default: [] },
  name: { type: String, required: true, trim: true }, part_num: { type: String, trim: true },
  delivered_by: { type: String, trim: true },
  delivered_to: { type: String, trim: true, validate: { validator(value) { return this.stored || Boolean(value); }, message: 'delivered_to is required for delivered items' } }
}, { collection: 'items', timestamps: { createdAt: 'dates.created', updatedAt: 'dates.modified' } });

itemSchema.pre('validate', function validateState() {
  const underRepair = this.under_repairment && this.stored && this.location?.warehouse === 'lab' && this.location.section == null && this.location.pack == null;
  if (this.stored && !underRepair && (!this.location?.warehouse || !this.location?.section || !this.location?.pack)) {
    this.invalidate('location', 'location warehouse, section, and pack are required for stored items');
  }
  if (this.stored && this.delivered_to) this.invalidate('delivered_to', 'delivered_to must be empty for stored items');
  if (!this.stored && !this.delivered_to) this.invalidate('delivered_to', 'delivered_to is required for delivered items');
});
itemSchema.index({ deleted: 1, 'dates.created': -1 });
itemSchema.index({ part_num: 1 });

module.exports = mongoose.model('Item', itemSchema);
