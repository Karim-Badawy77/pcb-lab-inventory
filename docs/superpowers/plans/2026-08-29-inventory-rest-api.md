# PCB Lab Inventory REST API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CommonJS Express REST API that manages physical inventory items, multiple local images, soft deletion, and automatic transaction history in MongoDB database `pcb-inventory`.

**Architecture:** Use thin Express routes and controllers over an inventory service, with Mongoose models enforcing document shape and the service enforcing state transitions. Item mutations and history creation run in one MongoDB transaction; Multer handles local images and compensating file cleanup handles filesystem failures.

**Tech Stack:** Node.js, CommonJS, Express, Mongoose, Multer, dotenv, Jest, Supertest, mongodb-memory-server

**Spec:** `docs/superpowers/specs/2026-08-29-inventory-rest-api-design.md`

## Global Constraints

- Use CommonJS (`require` and `module.exports`).
- Use MongoDB database `pcb-inventory` with collections `items` and `history`.
- Each item represents one physical object; do not add quantity tracking.
- Keep the API unauthenticated.
- Store zero or more images locally under `uploads/`.
- Generate history only for creation, location/delivery transitions, and soft deletion.
- Soft deletion sets `deleted: true` and writes exact value `"deleted"` into history `to`.
- Do not expose direct history mutation endpoints.
- Use MongoDB transactions; tests must run against an in-memory replica set.

## File Map

- `package.json`: dependencies and run/test scripts.
- `.env.example`: documented configuration without secrets.
- `.gitignore`: dependency, environment, coverage, and uploaded-file exclusions.
- `src/app.js`: Express composition and middleware registration.
- `src/server.js`: database connection and HTTP startup only.
- `src/config/env.js`: validated environment settings.
- `src/config/database.js`: Mongoose connect/disconnect functions.
- `src/models/item.model.js`: item, image, location, and update schemas.
- `src/models/history.model.js`: immutable transaction schema.
- `src/services/inventory-state.js`: pure normalization and transaction-comparison logic.
- `src/services/item.service.js`: item CRUD and atomic history orchestration.
- `src/services/file.service.js`: safe local file removal.
- `src/controllers/item.controller.js`: HTTP-to-service adapter.
- `src/routes/item.routes.js`: item REST routes.
- `src/middleware/upload.js`: Multer limits, filtering, and field name.
- `src/middleware/error-handler.js`: API errors, Multer errors, and fallback errors.
- `src/middleware/not-found.js`: unmatched-route response.
- `src/utils/api-error.js`: typed operational error.
- `tests/helpers/database.js`: replica-set lifecycle and collection cleanup.
- `tests/helpers/files.js`: temporary upload cleanup and fixture buffer.
- `tests/models/*.test.js`: schema tests.
- `tests/services/*.test.js`: state and transaction tests.
- `tests/integration/items.test.js`: complete HTTP contract.
- `README.md`: setup, configuration, endpoint, and multipart examples.

---

### Task 1: Runnable Express and MongoDB Foundation

**Files:**
- Create: `package.json`, `.env.example`, `.gitignore`
- Create: `src/config/env.js`, `src/config/database.js`, `src/app.js`, `src/server.js`
- Create: `src/utils/api-error.js`, `src/middleware/error-handler.js`, `src/middleware/not-found.js`
- Create: `tests/app.test.js`

**Interfaces:**
- Produces: `createApp(): Express`, `connectDatabase(uri): Promise<void>`, `disconnectDatabase(): Promise<void>`, `ApiError(statusCode, message, details?)`.

- [ ] **Step 1: Add the failing application smoke test**

```js
const request = require('supertest');
const { createApp } = require('../src/app');

test('unknown routes use the stable error envelope', async () => {
  const response = await request(createApp()).get('/missing');
  expect(response.status).toBe(404);
  expect(response.body).toEqual({ success: false, message: 'Route not found' });
});
```

- [ ] **Step 2: Initialize version control**

Run: `git init`

Expected: an empty Git repository is initialized in the project root. This project had no Git metadata when the plan was written.

- [ ] **Step 3: Create package metadata and verify the test fails**

Use scripts `start: node src/server.js`, `dev: node --watch src/server.js`, `test: jest --runInBand`, and `test:watch: jest --watch`. Install runtime packages `dotenv`, `express`, `mongoose`, and `multer`; development packages `jest`, `supertest`, and `mongodb-memory-server`.

Run: `npm test -- tests/app.test.js`

Expected: FAIL because `src/app.js` does not exist.

- [ ] **Step 4: Implement the minimal foundation**

`createApp()` must enable JSON parsing, expose `/uploads` statically, register later routes under `/api/items`, then install not-found and error middleware. Until Task 5 creates the router, use a small empty `express.Router()` export so application loading stays valid. `server.js` loads config, connects Mongoose, and listens only after connection succeeds. Exit with a nonzero code after logging a startup failure.

```js
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
module.exports = ApiError;
```

The error middleware returns `{ success: false, message }` and includes `details` only when present. `.env.example` defines `PORT=3000`, `MONGODB_URI=mongodb://127.0.0.1:27017/pcb-inventory`, `MAX_IMAGE_COUNT=10`, `MAX_IMAGE_SIZE_BYTES=5242880`, and `ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp`.

- [ ] **Step 5: Run the focused test**

Run: `npm test -- tests/app.test.js`

Expected: PASS.

- [ ] **Step 6: Commit the foundation**

```bash
git add package.json package-lock.json .env.example .gitignore src tests/app.test.js docs/superpowers
git commit -m "chore: scaffold inventory API"
```

### Task 2: Mongoose Item and History Models

**Files:**
- Create: `src/models/item.model.js`, `src/models/history.model.js`
- Create: `tests/helpers/database.js`, `tests/models/item.model.test.js`, `tests/models/history.model.test.js`

**Interfaces:**
- Produces: `Item` model using collection `items`; `History` model using collection `history`.
- Item fields: `images`, `dates`, `stored`, `deleted`, `location`, `owner`, `category`, `description`, `tags`, `updates`, `name`, `part_num`, `delivered_by`, `delivered_to`.
- History fields: `item_id`, `date`, `from`, `to`, `delivered_to`, `new_item`.

- [ ] **Step 1: Write failing schema tests**

```js
test('stored item requires a complete location and no recipient', async () => {
  const item = new Item({ name: 'PCB', part_num: 'P-1', stored: true,
    location: { warehouse: 'W1', section: 'S1', pack: 'P1' }, delivered_to: '' });
  await expect(item.validate()).resolves.toBeUndefined();
});

test('history accepts the deleted marker', async () => {
  const history = new History({ item_id: new mongoose.Types.ObjectId(), from: { warehouse: 'W1' },
    to: 'deleted', new_item: false });
  await expect(history.validate()).resolves.toBeUndefined();
});
```

Also assert tags are strings, image and update subdocuments receive `_id`, `deleted` defaults false, dates are populated on save, and delivered items require `delivered_to`.

- [ ] **Step 2: Run the model tests to verify failure**

Run: `npm test -- tests/models`

Expected: FAIL because the models do not exist.

- [ ] **Step 3: Implement focused schemas**

Use embedded schemas for location, image, and updates. Set timestamps to `{ createdAt: 'dates.created', updatedAt: 'dates.modified' }`. Use `Schema.Types.Mixed` for history `from` and `to` because the accepted domain is `null | location object | delivery string | "deleted"`. Add conditional validators for stored/delivered invariants and indexes on `{ deleted: 1, 'dates.created': -1 }`, `{ part_num: 1 }`, and `{ item_id: 1, date: 1 }`.

- [ ] **Step 4: Run the model tests**

Run: `npm test -- tests/models`

Expected: PASS.

- [ ] **Step 5: Commit models**

```bash
git add src/models tests/helpers tests/models
git commit -m "feat: define inventory data models"
```

### Task 3: Inventory State Rules

**Files:**
- Create: `src/services/inventory-state.js`
- Create: `tests/services/inventory-state.test.js`

**Interfaces:**
- Produces: `normalizeInventoryState(candidate): normalized`, `snapshotInventoryState(item): location|string|null`, `isInventoryTransaction(before, after): boolean`.
- Throws: `ApiError(400, ...)` for incomplete or contradictory state.

- [ ] **Step 1: Write the failing table-driven tests**

```js
test.each([
  [{ stored: true, location: { warehouse: 'W', section: 'S', pack: 'P' }, delivered_to: 'Lab' },
   { stored: true, location: { warehouse: 'W', section: 'S', pack: 'P' }, delivered_to: '' }],
  [{ stored: false, location: { warehouse: 'W', section: 'S', pack: 'P' }, delivered_to: 'Lab' },
   { stored: false, location: undefined, delivered_to: 'Lab' }]
])('normalizes inventory state', (input, expected) => {
  expect(normalizeInventoryState(input)).toEqual(expected);
});
```

Add tests rejecting stored items without all three location strings and delivered items without a recipient. Assert metadata-only changes are not transactions, while location and recipient changes are.

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- tests/services/inventory-state.test.js`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure state functions**

Normalize trimmed strings, clear the mutually exclusive destination, snapshot stored items as a plain location object and delivered items as the `delivered_to` string, and compare snapshots with deterministic field comparisons rather than JSON property order.

- [ ] **Step 4: Run the focused tests**

Run: `npm test -- tests/services/inventory-state.test.js`

Expected: PASS.

- [ ] **Step 5: Commit state rules**

```bash
git add src/services/inventory-state.js tests/services/inventory-state.test.js
git commit -m "feat: enforce inventory state transitions"
```

### Task 4: Atomic Item Service

**Files:**
- Create: `src/services/item.service.js`, `src/services/file.service.js`
- Create: `tests/services/item.service.test.js`

**Interfaces:**
- Produces: `createItem(payload, uploadedFiles): Promise<Item>`, `listItems(options): Promise<{items,total,page,limit}>`, `getItem(id, options): Promise<{item,history}>`, `updateItem(id, patch, uploadedFiles): Promise<Item>`, `softDeleteItem(id): Promise<Item>`.
- Produces: `removeFiles(paths): Promise<void>` that ignores missing files but rejects other filesystem errors.

- [ ] **Step 1: Write failing service tests against the replica set**

Create cases that assert: creation writes one `new_item` history row; metadata PATCH writes none; a location move writes correct `from` and `to`; delivery clears location and writes the recipient snapshot; returning to storage clears recipient; deletion sets the flag and writes `to: 'deleted'`; repeated deletion rejects with 409; normal reads hide deleted documents; `includeDeleted` reveals them.

Representative assertion:

```js
const item = await createItem(storedPayload, []);
const rows = await History.find({ item_id: item._id }).lean();
expect(rows).toHaveLength(1);
expect(rows[0]).toMatchObject({ from: null, to: storedPayload.location, new_item: true });
```

- [ ] **Step 2: Verify the service tests fail**

Run: `npm test -- tests/services/item.service.test.js`

Expected: FAIL because service functions do not exist.

- [ ] **Step 3: Implement transactional CRUD**

Map Multer files to `{ path: '/uploads/<filename>', originalName, uploadedAt }`. Whitelist patchable fields so `_id`, `deleted`, and dates cannot be overwritten. Parse tags and updates as arrays before calling the service. Wrap item/history writes in `mongoose.connection.transaction(async session => ...)`. Sort item lists by `dates.created` descending and history by `date` ascending. Validate page as positive and limit as `1..100`.

When update fails, remove only newly uploaded files. After a successful update, remove paths explicitly requested through `removeImageIds`. Do not delete retained files. If local cleanup after commit fails, log the orphan for operational cleanup without rolling back a committed database transaction.

- [ ] **Step 4: Run service tests**

Run: `npm test -- tests/services/item.service.test.js`

Expected: PASS, including rollback assertions that inject a failing `History.create`.

- [ ] **Step 5: Commit service behavior**

```bash
git add src/services tests/services/item.service.test.js
git commit -m "feat: add atomic inventory service"
```

### Task 5: Multiple-Image Upload and Item REST Endpoints

**Files:**
- Create: `src/middleware/upload.js`, `src/controllers/item.controller.js`, `src/routes/item.routes.js`
- Modify: `src/app.js`, `src/middleware/error-handler.js`
- Create: `tests/integration/items.test.js`, `tests/helpers/files.js`

**Interfaces:**
- Consumes: all item-service functions from Task 4.
- Produces: `POST/GET/PATCH/DELETE /api/items` contract and Multer middleware `upload.array('images', MAX_IMAGE_COUNT)`.

- [ ] **Step 1: Write failing endpoint tests**

Use Supertest to cover JSON and multipart requests, pagination, `includeDeleted`, lookup with included history, multiple `.attach('images', buffer, filename)` calls, individual removal through `removeImageIds`, invalid ObjectIds, disallowed MIME types, oversized files, missing records, contradictory states, and error envelopes.

```js
const response = await request(app).post('/api/items')
  .field('name', 'Controller')
  .field('part_num', 'C-1')
  .field('stored', 'true')
  .field('location', JSON.stringify({ warehouse: 'W', section: 'S', pack: 'P' }))
  .attach('images', imageBuffer, { filename: 'front.png', contentType: 'image/png' })
  .attach('images', imageBuffer, { filename: 'back.png', contentType: 'image/png' });
expect(response.status).toBe(201);
expect(response.body.data.images).toHaveLength(2);
```

- [ ] **Step 2: Verify endpoint tests fail**

Run: `npm test -- tests/integration/items.test.js`

Expected: FAIL because routes are not implemented.

- [ ] **Step 3: Implement upload middleware, controllers, and routes**

Give saved files collision-resistant generated names and never trust `originalname` as a path. Parse multipart JSON fields `location`, `tags`, `updates`, and `removeImageIds`; turn `stored` into a Boolean only when it is exactly `true`/`false` or their string equivalents. Controllers return `{ success: true, data }`; list responses include pagination under `data`. Map Multer limit errors to 413 and type-filter errors to 400. Ensure error paths invoke cleanup for newly uploaded files.

Register routes in this order: collection `POST`/`GET`, then `GET`/`PATCH`/`DELETE` at `/:id`. PATCH uses the same multiple-image field as POST.

- [ ] **Step 4: Run endpoint and full tests**

Run: `npm test -- tests/integration/items.test.js`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS with no open-handle warning.

- [ ] **Step 5: Commit the REST API**

```bash
git add src tests/integration tests/helpers
git commit -m "feat: expose item REST endpoints"
```

### Task 6: Documentation and Final Verification

**Files:**
- Create: `README.md`
- Modify: `.env.example` only if implementation names differ; prefer changing implementation to retain documented names.

**Interfaces:**
- Consumes: final HTTP contract and environment names.
- Produces: reproducible local setup and copyable curl examples.

- [ ] **Step 1: Write the README**

Document prerequisites, `npm install`, copying `.env.example` to `.env`, the MongoDB transaction/replica-set requirement, `npm start`, and `npm test`. Include a route table and curl examples for multipart creation with two images, JSON metadata update, delivery, return to storage, individual image removal, lookup with history, pagination, inclusion of deleted items, and soft deletion.

- [ ] **Step 2: Check documentation against executable configuration**

Run: `rg -n "PORT|MONGODB_URI|MAX_IMAGE_COUNT|MAX_IMAGE_SIZE_BYTES|ALLOWED_IMAGE_TYPES" README.md .env.example src`

Expected: the same five names appear consistently with no undocumented alternative.

- [ ] **Step 3: Run verification**

Run: `npm test`

Expected: all tests PASS.

Run: `npm audit --omit=dev`

Expected: no known production dependency vulnerabilities. If the command reports vulnerabilities, update only compatible direct dependencies, rerun tests, and record any remaining advisory in the README rather than using a forced major upgrade.

- [ ] **Step 4: Inspect repository hygiene**

Run: `git status --short`

Expected: only intended README/config changes are pending; `.env`, `node_modules/`, `coverage/`, and uploaded runtime images are absent.

- [ ] **Step 5: Commit documentation**

```bash
git add README.md .env.example .gitignore
git commit -m "docs: document inventory API"
```

- [ ] **Step 6: Perform final clean verification**

Run: `npm test && git status --short`

Expected: all tests PASS and the working tree is clean.
