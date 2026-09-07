# Frontend Stage 2 Repairment Creation and Read-Only Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend atomic item creation with per-unit repairments, then expose creation-time repairment cards and read-only repairment detail views in the frontend.

**Architecture:** Keep item creation in the existing `ItemForm` flow, extract one repeatable `RepairmentUnitFields` component for unit-specific state, and add read-only repairment card/detail components independent of the edit form. The backend accepts all unit repairments in the item-create transaction and maps optional item serials by index.

**Tech Stack:** Node.js, Express, Mongoose, Vue 3, Vue Router, Vite, Jest, Vue Test Utils, Supertest.

**Spec:** `docs/superpowers/specs/2026-09-07-frontend-stage-2-repairment-create-design.md`

## Global Constraints

- Repairment editing remains out of scope.
- `repairment.status` is selected from `repaired`, `unrepairable`, `repairing`, or `awaiting_spare_part`.
- Item and repairment serial numbers are optional.
- Under repair submits `under_repairment: true` and uses the fixed Lab location.
- Under repair creation requires exactly one repairment entry per quantity.
- Missing item serials leave matching repairment serials absent.
- Deleted repairments are hidden from normal item-detail cards.

---

### Task 1: Extend repairment schema and atomic item-create payload

**Files:**
- Modify: `src/models/repairment.model.js`
- Modify: `src/services/item.service.js`
- Modify: `src/controllers/item.controller.js`
- Test: `tests/models/models.test.js`
- Test: `tests/integration/items.test.js`

**Interfaces:**
- `Repairment` exposes `updates`, matching the item update subdocument shape, default `[]`, and optional `serial_num`.
- `createItem(payload, files)` accepts `payload.repairments` when `under_repairment` is true and creates one repairment per quantity in the same transaction.

- [ ] **Step 1: Write failing model and integration tests** for repairment updates, optional serials, item-create repairment arrays, serial mapping, exact quantity count, and invalid array-length rollback.
- [ ] **Step 2: Run `npm test -- --runInBand tests/models/models.test.js tests/integration/items.test.js`** and verify the new assertions fail; if MongoMemoryReplSet fails with the known Windows `spawn EPERM`, record that environment blocker and continue with model-focused RED verification.
- [ ] **Step 3: Add `updates` and optional `serial_num`** to the repairment schema.
- [ ] **Step 4: Parse `repairments` JSON** in the item controller and pass it into the item service.
- [ ] **Step 5: Validate and create repairments atomically** in `createItem`: require array length equal to quantity for under-repair items, copy `item.serial_num[index]` only when present, create one repairment per entry, and avoid the generic synchronization path creating duplicates.
- [ ] **Step 6: Run model tests and module-load checks**; verify new schema behavior and no route/service syntax errors.
- [ ] **Step 7: Commit** with `git add src tests && git commit -m "feat: create repairments with new items"`.

### Task 2: Refactor item-form state and add per-unit repairment cards

**Files:**
- Create: `frontend/src/features/item-form/RepairmentUnitFields.vue`
- Modify: `frontend/src/features/item-form/item-form.js`
- Modify: `frontend/src/features/item-form/ItemForm.vue`
- Modify: `frontend/src/features/item-form/item-form.test.js`
- Test: `frontend/src/features/item-form/RepairmentUnitFields.test.js`

**Interfaces:**
- `emptyItemForm()` includes API-aligned fields: `organization`, `type`, `quantity`, `serial_num`, `under_repairment`, and `repairments`.
- `toItemFormData(form, files, removeImageIds)` appends `under_repairment` and JSON `repairments` for creation.
- `validateItemForm` validates quantity and every repairment unit only when under repair.

- [ ] **Step 1: Write failing component/form tests** for the third radio, Lab display, type select, quantity card count, independent unit state, status select options, optional serials, dynamic dates/repairers/spare parts/updates, and exact `FormData` entries.
- [ ] **Step 2: Run `npm test -- --runInBand frontend/src/features/item-form/item-form.test.js frontend/src/features/item-form/RepairmentUnitFields.test.js`** and verify failure.
- [ ] **Step 3: Implement normalized form state** with stable unit-card objects and quantity reconciliation that preserves existing indices and truncates only excess units.
- [ ] **Step 4: Implement `RepairmentUnitFields`** with controlled add/remove rows for dates, repairers, spare parts, and update notes; use a select for the four statuses.
- [ ] **Step 5: Add creation-only rendering** in `ItemForm`: show Under repair only when creating, show fixed Lab location, hide warehouse/section/pack for that state, and keep repairment cards out of edit mode.
- [ ] **Step 6: Update item labels and payload names** from `category` to `organization`; make part number and serial values optional.
- [ ] **Step 7: Run focused frontend tests and the existing frontend suite.**
- [ ] **Step 8: Commit** with `git add frontend/src && git commit -m "feat: add repairment creation cards"`.

### Task 3: Add read-only repairment cards to item detail

**Files:**
- Create: `frontend/src/features/item-detail/RepairmentCard.vue`
- Modify: `frontend/src/pages/ItemDetailPage.vue`
- Modify: `frontend/src/lib/api.js`
- Test: `frontend/src/pages/ItemDetailPage.test.js`
- Test: `frontend/src/features/item-detail/RepairmentCard.test.js`

**Interfaces:**
- `apiRequest('/api/repairments/item/:itemId')` returns visible repairments.
- `RepairmentCard` accepts one repairment and links to `/repairments/:id`.

- [ ] **Step 1: Write failing tests** for fetching repairments, hiding deleted records from normal responses, card summary content, and detail links.
- [ ] **Step 2: Run the focused frontend tests** and verify failure.
- [ ] **Step 3: Load repairments alongside the item** in `ItemDetailPage` and render a read-only section when records exist.
- [ ] **Step 4: Implement card summary fields** for optional serial, status, repairer count, spare-part count, and latest update date.
- [ ] **Step 5: Run the focused page/component tests.**
- [ ] **Step 6: Commit** with `git add frontend/src && git commit -m "feat: show repairment cards on item detail"`.

### Task 4: Add read-only repairment detail route and page

**Files:**
- Create: `frontend/src/pages/RepairmentDetailPage.vue`
- Modify: `frontend/src/router.js`
- Create: `frontend/src/features/repairment-detail/RepairmentDetailPage.test.js`

**Interfaces:**
- The page loads `/api/repairments/:id` and renders the full read-only repairment record plus a link back to its item.

- [ ] **Step 1: Write the failing route/page test** for loading, rendering status/serial/dates/repairers/spare parts/updates, and item-context navigation.
- [ ] **Step 2: Run the focused test** and verify failure.
- [ ] **Step 3: Add the route and implement loading/error states** using the existing page patterns and `apiRequest`.
- [ ] **Step 4: Render all repairment fields** without edit/delete controls.
- [ ] **Step 5: Run the frontend suite and fix regressions.**
- [ ] **Step 6: Commit** with `git add frontend/src && git commit -m "feat: add repairment detail page"`.

### Task 5: Final verification and documentation

**Files:**
- Modify: `frontend/src/features/item-form/*.test.js` if coverage gaps remain
- Modify: `frontend/src/pages/*.test.js` if coverage gaps remain
- Modify: `README.md` only if API creation payload documentation is maintained there

- [ ] **Step 1: Run backend model/unit tests and frontend tests.**
- [ ] **Step 2: Attempt the full backend integration suite and capture any MongoDB environment failure separately from assertion failures.**
- [ ] **Step 3: Run `git diff --check` and search for stale frontend `category` references in the changed flow.
- [ ] **Step 4: Verify the final worktree and commit the verification updates** with `git add frontend/src tests README.md && git commit -m "test: verify frontend repairment stage 2"`.
