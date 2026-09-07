const service = require('../services/repairment.service');

const asyncController = (handler) => async (req, res, next) => { try { await handler(req, res); } catch (error) { next(error); } };
const parse = (body) => { const payload = { ...body }; for (const key of ['field_test_date', 'repairer', 'spare_part']) if (typeof payload[key] === 'string') payload[key] = JSON.parse(payload[key]); return payload; };
const create = asyncController(async (req, res) => res.status(201).json({ success: true, data: await service.createRepairment(req.params.itemId, parse(req.body)) }));
const list = asyncController(async (req, res) => res.json({ success: true, data: await service.listRepairments(req.params.itemId, { includeDeleted: req.query.includeDeleted === 'true' }) }));
const get = asyncController(async (req, res) => res.json({ success: true, data: await service.getRepairment(req.params.id, { includeDeleted: req.query.includeDeleted === 'true' }) }));
const update = asyncController(async (req, res) => res.json({ success: true, data: await service.updateRepairment(req.params.id, parse(req.body)) }));
const remove = asyncController(async (req, res) => res.json({ success: true, data: await service.softDeleteRepairment(req.params.id) }));
module.exports = { create, list, get, update, remove };
