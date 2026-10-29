const mongoose = require("mongoose");
const Item = require("../models/item.model");
const History = require("../models/history.model");
const { buildFieldChanges, plain } = require('./history.service');
const ApiError = require("../utils/api-error");
const {
    normalizeInventoryState,
    snapshotInventoryState,
    isInventoryTransaction,
} = require("./inventory-state");
const { removeFiles } = require("./file.service");
const { syncRepairments } = require('./repairment.service');
const Repairment = require('../models/repairment.model');

const EDITABLE = [
    "name",
    "part_num",
    "organization",
    "serial_num",
    "under_repairment",
    "type",
    "total_quantity",
    "available_quantity",
    "description",
    "tags",
    "updates",
    "delivered_by",
];

function assertId(id) {
    if (!mongoose.isObjectIdOrHexString(id))
        throw new ApiError(400, "Invalid item id");
}

function imageRecords(files) {
    return (files || []).map((file) => ({
        path: `/uploads/${file.filename}`,
        originalName: file.originalname,
        uploadedAt: new Date(),
    })).map((image, order) => ({ ...image, order }));
}

async function createItem(payload, files = []) {
    const { owner: legacyOwner, ...itemPayload } = payload;
    const state = normalizeInventoryState(itemPayload);
    const totalQuantity = itemPayload.total_quantity ?? 1;
    const availableQuantity = state.stored
        ? (payload.available_quantity ?? totalQuantity)
        : 0;
    let created;
    try {
        await mongoose.connection.transaction(async (session) => {
            created = await new Item({
                ...itemPayload,
                total_quantity: totalQuantity,
                available_quantity: availableQuantity,
                ...state,
                images: imageRecords(files),
            }).save({ session });
            if (Array.isArray(payload.repairments)) {
                if (payload.repairments.length > created.total_quantity || (created.under_repairment && payload.repairments.length !== created.total_quantity)) {
                    throw new ApiError(400, 'Repairment records must match the item quantity');
                }
                for (const [index, repairment] of payload.repairments.entries()) {
                    if (repairment.repaired && repairment.golden) {
                        throw new ApiError(400, 'A repairment cannot be both repaired and golden');
                    }
                    await new Repairment({
                        ...repairment,
                        ...(repairment.owner === undefined && legacyOwner !== undefined ? { owner: legacyOwner } : {}),
                        item_id: created._id,
                        ...(!repairment.serial_num && created.serial_num[index] ? { serial_num: created.serial_num[index] } : {}),
                    }).save({ session });
                }
            } else {
                await syncRepairments(created, session);
            }
            await History.create(
                [
                    {
                        item_id: created._id,
                        fields: Object.keys(created.toObject()).filter((key) => !['_id', '__v', 'dates'].includes(key)).map((field_name) => ({ field_name, from: null, to: plain(created[field_name]) })),
                    },
                ],
                { session },
            );
        });
        return created;
    } catch (error) {
        await removeFiles(files.map((file) => file.path));
        throw error;
    }
}

async function listItems({
    includeDeleted = false,
    page = 1,
    limit = 20,
} = {}) {
    page = Number(page);
    limit = Number(limit);
    if (
        !Number.isInteger(page) ||
        page < 1 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100
    )
        throw new ApiError(400, "Invalid pagination");
    const filter = includeDeleted ? {} : { deleted: false };
    const [items, total] = await Promise.all([
        Item.find(filter)
            .sort({ "dates.created": -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        Item.countDocuments(filter),
    ]);
    const goldenItemIds = items.length
        ? await Repairment.distinct('item_id', {
            item_id: { $in: items.map((item) => item._id) },
            golden: true,
            deleted: { $ne: true },
        })
        : [];
    const goldenItemIdSet = new Set(goldenItemIds.map((id) => String(id)));
    const itemRepairments = items.length ? await Repairment.find({ item_id: { $in: items.map((item) => item._id) }, deleted: false }).select('item_id owner').lean() : [];
    const ownersByItem = new Map();
    for (const repairment of itemRepairments) {
        const key = String(repairment.item_id);
        if (!ownersByItem.has(key)) ownersByItem.set(key, []);
        if (repairment.owner) ownersByItem.get(key).push(repairment.owner);
    }
    const itemsWithGoldenFlag = items.map((item) => {
        const itemData = item.toObject();
        itemData.images = itemData.images.filter((image) => !image.deleted).sort((a, b) => a.order - b.order);
        return {
            ...itemData,
            owners: [...new Set(ownersByItem.get(String(item._id)) || [])],
            has_golden_repairment: goldenItemIdSet.has(String(item._id)),
        };
    });
    return { items: itemsWithGoldenFlag, total, page, limit };
}

async function getItem(id, { includeDeleted = false } = {}) {
    assertId(id);
    const item = await Item.findOne({
        _id: id,
        ...(includeDeleted ? {} : { deleted: false }),
    });
    if (!item) throw new ApiError(404, "Item not found");
    const history = await History.find({ item_id: item._id }).sort({ date: 1 });
    const itemData = item.toObject();
    itemData.images = itemData.images.filter((image) => !image.deleted).sort((a, b) => a.order - b.order);
    return { item: itemData, history };
}

async function updateItem(id, patch, files = []) {
    assertId(id);
    let updated;
    let removedPaths = [];
    try {
        await mongoose.connection.transaction(async (session) => {
            const item = await Item.findOne({
                _id: id,
                deleted: false,
            }).session(session);
            if (!item) throw new ApiError(404, "Item not found");
            const before = item.toObject();
            for (const key of EDITABLE)
                if (Object.hasOwn(patch, key)) item[key] = patch[key];
            if (Object.hasOwn(patch, 'total_quantity') && !Object.hasOwn(patch, 'available_quantity')) {
                item.available_quantity = Math.min(item.available_quantity, item.total_quantity);
            }
            if (
                ["stored", "location", "delivered_to", "under_repairment"].some((key) =>
                    Object.hasOwn(patch, key),
                )
            ) {
                const state = normalizeInventoryState({
                    stored: Object.hasOwn(patch, "stored")
                        ? patch.stored
                        : item.stored,
                    location: Object.hasOwn(patch, "location")
                        ? patch.location
                        : item.location?.toObject(),
                    under_repairment: Object.hasOwn(patch, 'under_repairment')
                        ? patch.under_repairment
                        : item.under_repairment,
                    delivered_to: Object.hasOwn(patch, "delivered_to")
                        ? patch.delivered_to
                        : item.delivered_to,
                });
                item.stored = state.stored;
                item.location = state.location;
                item.delivered_to = state.delivered_to;
            }
            if (!item.stored) item.available_quantity = 0;
            if (!item.stored) {
                const undeliveredRepairments = await Repairment.countDocuments({
                    item_id: item._id,
                    deleted: false,
                    status: { $ne: "delivered" },
                }).session(session);
                if (undeliveredRepairments > 0) {
                    throw new ApiError(400, "All repairments must be delivered before the item can be delivered");
                }
            }
            const activeImages = item.images.filter((image) => !image.deleted).sort((a, b) => a.order - b.order);
            const removeIds = new Set((patch.removeImageIds || []).map(String));
            for (const image of activeImages) {
                if (removeIds.has(String(image._id))) {
                    image.deleted = true;
                    image.deletedAt = new Date();
                }
            }
            const remainingImages = activeImages.filter((image) => !removeIds.has(String(image._id)));
            if (Array.isArray(patch.imageOrder)) {
                const requestedOrder = patch.imageOrder.map(String);
                const remainingIds = new Set(remainingImages.map((image) => String(image._id)));
                if (requestedOrder.length !== remainingImages.length || requestedOrder.some((id) => !remainingIds.has(id))) {
                    throw new ApiError(400, "Invalid image order");
                }
                remainingImages.sort((a, b) => requestedOrder.indexOf(String(a._id)) - requestedOrder.indexOf(String(b._id)));
            }
            remainingImages.forEach((image, order) => { image.order = order; });
            const newImages = imageRecords(files);
            newImages.forEach((image, index) => { image.order = remainingImages.length + index; });
            item.images.push(...newImages);
            await item.save({ session });
            await syncRepairments(item, session);
            const changes = buildFieldChanges(before, item.toObject(), [...EDITABLE, 'images', 'stored', 'location', 'delivered_to', 'deleted']);
            if (changes.length) {
                item.edit_count = (before.edit_count || 0) + 1;
                await item.save({ session });
                await History.create(
                    [
                        {
                            item_id: item._id,
                            fields: changes,
                        },
                    ],
                    { session },
                );
            }
            updated = item;
        });
        await removeFiles(removedPaths);
        return updated;
    } catch (error) {
        await removeFiles(files.map((file) => file.path));
        throw error;
    }
}

async function addUnits(id, quantity) {
    assertId(id);
    const amount = Number(quantity);
    if (!Number.isInteger(amount) || amount < 1) throw new ApiError(400, "Quantity must be a positive whole number");
    return mongoose.connection.transaction(async (session) => {
        const item = await Item.findOne({ _id: id, deleted: false }).session(session);
        if (!item) throw new ApiError(404, "Item not found");
        const from = { total_quantity: item.total_quantity, available_quantity: item.available_quantity };
        item.total_quantity += amount;
        item.available_quantity += amount;
        item.edit_count = (item.edit_count || 0) + 1;
        await item.save({ session });
        await History.create([{
            item_id: item._id,
            fields: [
                { field_name: "total_quantity", from: from.total_quantity, to: item.total_quantity },
                { field_name: "available_quantity", from: from.available_quantity, to: item.available_quantity },
            ],
        }], { session });
        return item;
    });
}

async function softDeleteItem(id) {
    assertId(id);
    let deleted;
    await mongoose.connection.transaction(async (session) => {
        const item = await Item.findById(id).session(session);
        if (!item) throw new ApiError(404, "Item not found");
        if (item.deleted) throw new ApiError(409, "Item is already deleted");
        const from = item.toObject();
        item.deleted = true;
        item.edit_count = (item.edit_count || 0) + 1;
        deleted = await item.save({ session });
        await History.create(
            [
                {
                    item_id: item._id,
                    fields: [{ field_name: 'deleted', from: from.deleted, to: true }],
                },
            ],
            { session },
        );
    });
    return deleted;
}

module.exports = { createItem, listItems, getItem, updateItem, addUnits, softDeleteItem };
