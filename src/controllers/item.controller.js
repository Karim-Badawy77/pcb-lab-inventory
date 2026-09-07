const itemService = require("../services/item.service");
const { removeFiles } = require("../services/file.service");

const JSON_FIELDS = ["location", "tags", "updates", "removeImageIds"];

function parsePayload(body) {
    const payload = { ...body };
    for (const field of JSON_FIELDS) {
        if (typeof payload[field] === "string")
            payload[field] = JSON.parse(payload[field]);
    }
    if (typeof payload.stored === "string") {
        if (!["true", "false"].includes(payload.stored))
            throw Object.assign(new Error("stored must be true or false"), {
                statusCode: 400,
            });
        payload.stored = payload.stored === "true";
    }
    for (const field of ['functional', 'under_repairment']) {
        if (typeof payload[field] === 'string') {
            if (!['true', 'false'].includes(payload[field])) throw Object.assign(new Error(`${field} must be true or false`), { statusCode: 400 });
            payload[field] = payload[field] === 'true';
        }
    }
    for (const field of ['quantity']) if (typeof payload[field] === 'string') payload[field] = Number(payload[field]);
    return payload;
}

function asyncController(handler) {
    return async (req, res, next) => {
        try {
            await handler(req, res);
        } catch (error) {
            if (req.files?.length)
                await removeFiles(req.files.map((file) => file.path)).catch(
                    () => {},
                );
            next(error);
        }
    };
}

const create = asyncController(async (req, res) => {
    const item = await itemService.createItem(
        parsePayload(req.body),
        req.files,
    );
    res.status(201).json({ success: true, data: item });
});

const list = asyncController(async (req, res) => {
    const data = await itemService.listItems({
        includeDeleted: req.query.includeDeleted === "true",
        page: req.query.page || 1,
        limit: req.query.limit || 20,
    });
    res.json({ success: true, data });
});

const get = asyncController(async (req, res) => {
    const { item, history } = await itemService.getItem(req.params.id, {
        includeDeleted: req.query.includeDeleted === "true",
    });
    res.json({ success: true, data: { ...item.toObject(), history } });
});

const update = asyncController(async (req, res) => {
    const item = await itemService.updateItem(
        req.params.id,
        parsePayload(req.body),
        req.files,
    );
    res.json({ success: true, data: item });
});

const remove = asyncController(async (req, res) => {
    const item = await itemService.softDeleteItem(req.params.id);
    res.json({ success: true, data: item });
});

module.exports = { create, list, get, update, remove };
