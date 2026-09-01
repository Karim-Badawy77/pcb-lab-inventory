const mongoose = require("mongoose");
const path = require("path");
const Item = require("../models/item.model");
const History = require("../models/history.model");
const ApiError = require("../utils/api-error");
const {
    normalizeInventoryState,
    snapshotInventoryState,
    isInventoryTransaction,
} = require("./inventory-state");
const { removeFiles } = require("./file.service");

const EDITABLE = [
    "name",
    "part_num",
    "owner",
    "category",
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
    }));
}

async function createItem(payload, files = []) {
    const state = normalizeInventoryState(payload);
    let created;
    try {
        await mongoose.connection.transaction(async (session) => {
            created = await new Item({
                ...payload,
                ...state,
                images: imageRecords(files),
            }).save({ session });
            await History.create(
                [
                    {
                        item_id: created._id,
                        from: null,
                        to: snapshotInventoryState(created),
                        delivered_to: created.stored
                            ? undefined
                            : created.delivered_to,
                        new_item: true,
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
    return { items, total, page, limit };
}

async function getItem(id, { includeDeleted = false } = {}) {
    assertId(id);
    const item = await Item.findOne({
        _id: id,
        ...(includeDeleted ? {} : { deleted: false }),
    });
    if (!item) throw new ApiError(404, "Item not found");
    const history = await History.find({ item_id: item._id }).sort({ date: 1 });
    return { item, history };
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
            if (
                ["stored", "location", "delivered_to"].some((key) =>
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
                    delivered_to: Object.hasOwn(patch, "delivered_to")
                        ? patch.delivered_to
                        : item.delivered_to,
                });
                item.stored = state.stored;
                item.location = state.location;
                item.delivered_to = state.delivered_to;
            }
            const removeIds = new Set((patch.removeImageIds || []).map(String));
            removedPaths = item.images
                .filter((image) => removeIds.has(String(image._id)))
                .map((image) => path.resolve(image.path.replace(/^\//, "")));
            item.images = item.images.filter(
                (image) => !removeIds.has(String(image._id)),
            );
            item.images.push(...imageRecords(files));
            await item.save({ session });
            if (isInventoryTransaction(before, item)) {
                await History.create(
                    [
                        {
                            item_id: item._id,
                            from: snapshotInventoryState(before),
                            to: snapshotInventoryState(item),
                            delivered_to: item.stored
                                ? undefined
                                : item.delivered_to,
                            new_item: false,
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

async function softDeleteItem(id) {
    assertId(id);
    let deleted;
    await mongoose.connection.transaction(async (session) => {
        const item = await Item.findById(id).session(session);
        if (!item) throw new ApiError(404, "Item not found");
        if (item.deleted) throw new ApiError(409, "Item is already deleted");
        const from = snapshotInventoryState(item);
        item.deleted = true;
        deleted = await item.save({ session });
        await History.create(
            [
                {
                    item_id: item._id,
                    from,
                    to: "deleted",
                    delivered_to: item.delivered_to,
                    new_item: false,
                },
            ],
            { session },
        );
    });
    return deleted;
}

module.exports = { createItem, listItems, getItem, updateItem, softDeleteItem };
