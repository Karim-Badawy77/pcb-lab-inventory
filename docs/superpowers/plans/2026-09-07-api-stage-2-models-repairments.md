# API Stage 2 Models and Repairments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor item and history persistence, add quantity-based repairment APIs, and audit every item/repairment edit without changing the frontend.

**Architecture:** Keep the existing Express/Mongoose service-controller-route pattern. Add a focused repairment model/service/controller/routes, centralize field-diff history generation, and execute item, repairment, edit-count, and history writes in MongoDB transactions.

**Tech Stack:** Node.js, Express, Mongoose, Jest, Supertest, MongoDB transactions.

**Spec:** `docs/superpowers/specs/2026-09-07-api-stage-2-models-repairments-design.md`

## Global Constraints

- Frontend changes are out of scope.
- `item.type` accepts only `pcb`, `module`, or `else`.
- `item.serial_num` is `[String]`, default `[]`.
- Under repair means `stored: true` and `location: { warehouse: "lab", section: null, pack: null }`.
- Repairment soft deletion is logical deletion; repeated deletion is rejected.
- Every item/repairment edit increments the parent item `edit_count` exactly once.
- Every change is recorded as `{ field_name, from, to }`; new values use `from: null`.

---

### Task 1: Update model schemas and model tests

**Files:**
- Modify: `src/models/item.model.js`
- Modify: `src/models/history.model.js`
- Create: `src/models/repairment.model.js`
- Test: `tests/models/models.test.js`

**Interfaces:**
- Produces Item fields `organization`, `serial_num`, `functional`, `under_repairment`, `type`, `edit_count`, and `quantity`.
- Produces History fields `item_id`, nullable `repairment_id`, `fields`, and `date`.
- Produces Repairment fields `item_id`, `status`, `field_test_date`, `repairer`, `spare_part`, `deleted`, and timestamps.

- [ ] **Step 1: Write failing model tests** for renamed/optional item fields, defaults, type/status enums, positive quantity, structured spare parts, and nullable `repairment_id`.
- [ ] **Step 2: Run `npm test -- --runInBand tests/models/models.test.js`** and verify the new assertions fail against the old schemas.
- [ ] **Step 3: Implement the three schemas**, preserving existing storage/delivery/image/update validation and adding the exact defaults/enums from the spec.
- [ ] **Step 4: Run the focused model tests** and confirm they pass.
- [ ] **Step 5: Commit** with `git add src/models tests/models/models.test.js && git commit -m "feat: add stage 2 inventory models"`.

### Task 2: Add shared field-diff history and refactor item service

**Files:**
- Create: `src/services/history.service.js`
- Modify: `src/services/item.service.js`
- Modify: `src/controllers/item.controller.js`
- Modify: `src/services/inventory-state.js` if required by lab normalization
- Test: `tests/integration/items.test.js`

**Interfaces:**
- `buildFieldChanges(before, after, fields)` returns `{ field_name, from, to }[]` using deep equality and `null` for absent prior values.
- Item service creates history with `repairment_id: null` and increments `edit_count` once per successful item edit.

- [ ] **Step 1: Add failing integration tests** for all-field item history, `organization`, optional `part_num`, defaults, and one edit-count increment for multi-field patches.
- [ ] **Step 2: Run the focused integration tests** and verify failure.
- [ ] **Step 3: Implement field snapshots/diffs** that serialize subdocuments and arrays consistently, update the editable allowlist, and replace old inventory-only `from`/`to` history writes.
- [ ] **Step 4: Implement under-repair normalization** to force `stored: true` and `{ warehouse: "lab", section: null, pack: null }`, reject invalid states atomically, and leave quantity synchronization to Task 3 after the repairment service exists.
- [ ] **Step 5: Run item tests and the existing full backend suite** with `npm test -- --runInBand`.
- [ ] **Step 6: Commit** with `git add src/services src/controllers tests/integration/items.test.js && git commit -m "feat: record item field history"`.

### Task 3: Implement repairment service and API

**Files:**
- Create: `src/services/repairment.service.js`
- Create: `src/controllers/repairment.controller.js`
- Create: `src/routes/repairment.routes.js`
- Modify: `src/app.js`
- Modify: `src/services/item.service.js`
- Test: `tests/integration/repairments.test.js`

**Interfaces:**
- `createRepairment(itemId, payload)` creates one non-deleted repairment and writes item-linked history.
- `listRepairments(itemId, { includeDeleted })` excludes deleted records by default.
- `getRepairment(id, { includeDeleted })` returns one visible repairment or 404.
- `updateRepairment(id, patch)` updates allowed fields, increments the parent item once, and writes history with `repairment_id`.
- `softDeleteRepairment(id)` sets `deleted: true`, increments the parent item once, records deletion, and rejects repeats.
- `syncRepairments(item, session)` creates missing records until active repairment count reaches `item.quantity` without duplicates.

- [ ] **Step 1: Write failing HTTP/service tests** for create/list/get/update/delete, field-level repairment history, parent edit count, hidden deleted records, and repeated deletion.
- [ ] **Step 2: Run `npm test -- --runInBand tests/integration/repairments.test.js`** and verify failure.
- [ ] **Step 3: Implement the repairment service** with ID validation, parent-item lookup, transaction boundaries, allowed fields, and shared history diff generation.
- [ ] **Step 4: Add controllers and routes** under `/api/repairments`, including item-filtered listing and `includeDeleted=true` support.
- [ ] **Step 5: Integrate quantity synchronization** into item create/update when `under_repairment` is true; ensure repairment creation does not recursively increment item edit count.
- [ ] **Step 6: Run focused repairment tests and full backend tests.**
- [ ] **Step 7: Commit** with `git add src tests/integration/repairments.test.js && git commit -m "feat: add repairment API"`.

### Task 4: Finish compatibility coverage and verification

**Files:**
- Modify: `tests/models/models.test.js`
- Modify: `tests/integration/items.test.js`
- Modify: `tests/app.test.js` only if route registration coverage requires it
- Modify: `README.md` if API endpoint documentation is maintained there

- [ ] **Step 1: Replace old history assertions** that expect top-level `from`/`to` with field-list assertions and nullable `repairment_id` checks.
- [ ] **Step 2: Add rollback coverage** proving invalid under-repair updates leave item, repairments, edit count, and history unchanged.
- [ ] **Step 3: Run `npm test -- --runInBand` and `npm run test:coverage` if available.**
- [ ] **Step 4: Run `git diff --check` and inspect the complete diff for stale `category`, old history shape, and unguarded repairment reads.
- [ ] **Step 5: Commit** with `git add tests README.md && git commit -m "test: verify stage 2 API behavior"`.
