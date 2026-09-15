const mongoose = require('mongoose');
const Repairment = require('../models/repairment.model');
const Item = require('../models/item.model');
const History = require('../models/history.model');
const ApiError = require('../utils/api-error');
const { buildFieldChanges, plain } = require('./history.service');

const EDITABLE = ['status', 'field_test_date', 'repairer', 'spare_part', 'updates', 'delivered_to', 'delivered_by', 'delivered_at'];
function assertId(id) { if (!mongoose.isObjectIdOrHexString(id)) throw new ApiError(400, 'Invalid repairment id'); }
function assertItemId(id) { if (!mongoose.isObjectIdOrHexString(id)) throw new ApiError(400, 'Invalid item id'); }

async function createRepairment(itemId, payload) {
  assertItemId(itemId);
  return mongoose.connection.transaction(async (session) => {
    const item = await Item.findOne({ _id: itemId, deleted: false }).session(session);
    if (!item) throw new ApiError(404, 'Item not found');
    if (payload.status === 'delivered' && !payload.delivered_to?.trim()) throw new ApiError(400, 'delivered_to is required for delivered repairments');
    const repairment = await new Repairment({ ...payload, ...(payload.status === 'delivered' ? { delivered_at: payload.delivered_at || new Date() } : {}), item_id: item._id }).save({ session });
    await Item.updateOne({ _id: item._id }, { $inc: { edit_count: 1 } }, { session });
    await History.create([{ item_id: item._id, repairment_id: repairment._id, fields: Object.keys(repairment.toObject()).filter((key) => !['_id', '__v', 'item_id', 'createdAt', 'updatedAt'].includes(key)).map((field_name) => ({ field_name, from: null, to: plain(repairment[field_name]) })) }], { session });
    return repairment;
  });
}

async function listRepairments(itemId, { includeDeleted = false } = {}) {
  assertItemId(itemId);
  return Repairment.find({ item_id: itemId, ...(includeDeleted ? {} : { deleted: false }) }).sort({ createdAt: 1 });
}
async function getRepairment(id, { includeDeleted = false } = {}) { assertId(id); const row = await Repairment.findOne({ _id: id, ...(includeDeleted ? {} : { deleted: false }) }); if (!row) throw new ApiError(404, 'Repairment not found'); const history = await History.find({ repairment_id: row._id }).sort({ date: 1 }); return { ...row.toObject(), history }; }

async function updateRepairment(id, patch) {
  assertId(id);
  return mongoose.connection.transaction(async (session) => {
    const repairment = await Repairment.findOne({ _id: id, deleted: false }).session(session);
    if (!repairment) throw new ApiError(404, 'Repairment not found');
    const before = repairment.toObject();
    if (patch.status === 'delivered') {
      if (!patch.delivered_to?.trim() && !repairment.delivered_to) throw new ApiError(400, 'delivered_to is required for delivered repairments');
      patch = { ...patch, delivered_at: patch.delivered_at || new Date() };
    }
    for (const key of EDITABLE) {
      if (!Object.hasOwn(patch, key)) continue;
      repairment[key] = key === 'updates'
        ? [...(repairment.updates || []), ...(patch.updates || [])]
        : patch[key];
    }
    const fields = buildFieldChanges(before, repairment.toObject(), EDITABLE);
    if (!fields.length) return repairment;
    await repairment.save({ session });
    if (repairment.status === 'delivered') {
      const remaining = await Repairment.countDocuments({ item_id: repairment.item_id, deleted: false, status: { $ne: 'delivered' } }).session(session);
      if (remaining === 0) await Item.updateOne({ _id: repairment.item_id, deleted: false }, { $set: { stored: false, under_repairment: false, location: undefined, delivered_to: repairment.delivered_to || '', delivered_by: repairment.delivered_by || '' }, $inc: { edit_count: 1 } }, { session });
    }
    await Item.updateOne({ _id: repairment.item_id, deleted: false }, { $inc: { edit_count: 1 } }, { session });
    await History.create([{ item_id: repairment.item_id, repairment_id: repairment._id, fields }], { session });
    return repairment;
  });
}

async function softDeleteRepairment(id) {
  assertId(id);
  return mongoose.connection.transaction(async (session) => {
    const repairment = await Repairment.findById(id).session(session);
    if (!repairment) throw new ApiError(404, 'Repairment not found');
    if (repairment.deleted) throw new ApiError(409, 'Repairment is already deleted');
    repairment.deleted = true;
    await repairment.save({ session });
    await Item.updateOne({ _id: repairment.item_id, deleted: false }, { $inc: { edit_count: 1 } }, { session });
    await History.create([{ item_id: repairment.item_id, repairment_id: repairment._id, fields: [{ field_name: 'deleted', from: false, to: true }] }], { session });
    return repairment;
  });
}

async function syncRepairments(item, session) {
  if (!item.under_repairment) return [];
  const count = await Repairment.countDocuments({ item_id: item._id, deleted: false }).session(session);
  const created = [];
  for (let i = count; i < item.quantity; i += 1) created.push(await new Repairment({ item_id: item._id, status: 'repairing' }).save({ session }));
  return created;
}

module.exports = { createRepairment, listRepairments, getRepairment, updateRepairment, softDeleteRepairment, syncRepairments };
