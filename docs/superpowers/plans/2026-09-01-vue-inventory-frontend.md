# Vue Inventory Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a locally installed, offline-capable Vue frontend for creating, browsing, editing, and soft-deleting PCB inventory items.

**Architecture:** Vue 3 single-file components live in `client/` and are compiled by Vite into an ignored `public/` production directory served by Express. Page components own route data and API calls, reusable components own focused interactions, and pure utilities own validation, filtering, serialization, and formatting.

**Tech Stack:** Node.js 24+, Express 5, Vue 3, Vue Router 4, Vite, Vitest, Vue Test Utils, jsdom, Jest, Supertest

**Spec:** `docs/superpowers/specs/2026-09-01-vue-inventory-frontend-design.md`

## Global Constraints

- The deployed application must work without internet access or runtime CDN requests.
- Search and filtering remain client-side; load all active API pages with `limit=100` before filtering.
- Mobile-first Modern Workbench styling uses warm off-white, circuit green, lime actions, 44-pixel minimum touch targets, and no horizontal phone scrolling.
- Accepted images are JPEG, PNG, or WebP; allow at most 10 images and 5 MB per image in the client, while treating server validation as authoritative.
- Stored items require warehouse, section, and pack; delivered items require delivered-to and may include delivered-by.
- The existing API response envelopes and multipart field names remain unchanged.
- Soft deletion is available only from item detail and requires typing the exact item name.
- Do not add authentication, server-side search, deleted-item browsing, service workers, TypeScript, or a third-party component framework.

---

### Task 1: Local Vue Toolchain and Express SPA Hosting

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Modify: `src/app.js`
- Modify: `tests/app.test.js`
- Create: `client/index.html`
- Create: `client/vite.config.js`
- Create: `client/src/main.js`
- Create: `client/src/App.vue`
- Create: `client/src/router.js`
- Create: `client/src/pages/InventoryPage.vue`

**Interfaces:**
- Consumes: existing `createApp()` API and `/api/items`, `/uploads` route ownership.
- Produces: `createApp({ frontendDir } = {})`; Vite aliases `@` to `client/src`; root scripts `dev:api`, `dev:web`, `build`, `test:api`, `test:web`, and `test`.

- [ ] **Step 1: Write failing SPA hosting tests**

Add temporary-frontend setup to `tests/app.test.js` and assert route fallback without relying on committed build output:

```js
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

test('serves frontend assets and SPA routes without swallowing API 404s', async () => {
  const frontendDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pcb-frontend-'));
  await fs.writeFile(path.join(frontendDir, 'index.html'), '<main id="app">PCB Inventory</main>');
  await fs.writeFile(path.join(frontendDir, 'app.css'), 'body{color:green}');
  const hostedApp = createApp({ frontendDir });

  expect((await request(hostedApp).get('/app.css')).text).toContain('color:green');
  expect((await request(hostedApp).get('/items/new')).text).toContain('PCB Inventory');
  expect((await request(hostedApp).get('/items/507f1f77bcf86cd799439011')).text).toContain('PCB Inventory');
  const api404 = await request(hostedApp).get('/api/missing');
  expect(api404.status).toBe(404);
  expect(api404.body).toMatchObject({ success: false });
});
```

- [ ] **Step 2: Run the hosting test and verify it fails**

Run: `npm test -- --runTestsByPath tests/app.test.js`

Expected: FAIL because `createApp` does not accept or serve `frontendDir`.

- [ ] **Step 3: Install local frontend dependencies and add scripts**

Run:

```powershell
npm install vue vue-router
npm install --save-dev vite @vitejs/plugin-vue vitest @vue/test-utils jsdom
```

Set these scripts in `package.json` while retaining `start`, `dev`, and `test:watch`:

```json
{
  "dev:api": "node --watch src/server.js",
  "dev:web": "vite --config client/vite.config.js",
  "build": "vite build --config client/vite.config.js",
  "test:api": "jest --runInBand",
  "test:web": "vitest run --config client/vite.config.js",
  "test": "npm run test:api && npm run test:web"
}
```

Add `public/` and `.superpowers/` to `.gitignore`. Keep `client/` trackable; remove the obsolete `frontend/` ignore entry.

- [ ] **Step 4: Implement configurable SPA hosting**

Change `src/app.js` so API and upload middleware stay before static hosting and the error handlers remain last:

```js
function createApp({ frontendDir = path.resolve('public') } = {}) {
  const app = express();
  app.use(express.json());
  app.use('/uploads', express.static(path.resolve('uploads')));
  app.use('/api/items', itemRoutes);
  app.use(express.static(frontendDir));
  app.get(/^(?!\/api(?:\/|$)|\/uploads(?:\/|$)).*/, (req, res, next) => {
    res.sendFile(path.join(frontendDir, 'index.html'), (error) => error ? next() : undefined);
  });
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 5: Add the minimal Vite application**

Configure `client/vite.config.js` with `root: __dirname`, output to `../public`, `emptyOutDir: true`, Vue plugin, `test: { environment: 'jsdom', passWithNoTests: true }`, `@` alias, and development proxies for `/api` and `/uploads` to `http://localhost:3000`. Create an HTML entry with `<div id="app"></div>` and `<script type="module" src="/src/main.js"></script>`.

Define router routes for `/`, `/items`, `/items/new`, and `/items/:id`; initially point item routes to `InventoryPage.vue`, whose template says `Inventory frontend ready`. Mount `<App />` with the router in `main.js`, and make `App.vue` render `<RouterView />`.

- [ ] **Step 6: Run API tests, frontend tests, and production build**

Run:

```powershell
npm run test:api
npm run test:web
npm run build
```

Expected: API tests PASS, Vitest exits successfully with no tests, and `public/index.html` plus hashed local assets are created without external script URLs.

- [ ] **Step 7: Commit the toolchain slice**

```powershell
git add package.json package-lock.json .gitignore src/app.js tests/app.test.js client
git commit -m "feat: add local Vue frontend toolchain"
```

### Task 2: API Client, Pagination, Search, Filters, and Formatting

**Files:**
- Create: `client/src/lib/api.js`
- Create: `client/src/lib/inventory.js`
- Create: `client/src/lib/inventory.test.js`

**Interfaces:**
- Consumes: API envelopes `{ success, data }` and list payload `{ items, total, page, limit }`.
- Produces: `apiRequest(path, options)`, `fetchAllItems()`, `normalizeSearch(value)`, `filterItems(items, criteria)`, `uniqueFilterOptions(items)`, `formatLocation(item)`, and `primaryImage(item)`.

- [ ] **Step 1: Write failing utility and pagination tests**

Create `client/src/lib/inventory.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';
import { fetchAllItems } from './api';
import { filterItems, formatLocation, primaryImage, uniqueFilterOptions } from './inventory';

const items = [
  { _id: '1', name: 'Motor Controller', part_num: 'PCB-042', description: 'Three phase', owner: 'Karim', category: 'Control', tags: ['motor'], stored: true, location: { warehouse: 'W1', section: 'S2', pack: 'P3' }, images: [{ path: '/uploads/a.webp' }] },
  { _id: '2', name: 'Sensor Board', part_num: 'SNS-018', description: '', owner: 'Mona', category: 'Sensor', tags: ['analog'], stored: false, delivered_to: 'Assembly' }
];

it('combines normalized search and filters', () => {
  expect(filterItems(items, { query: ' pcb-042 ', status: 'stored', category: 'Control', warehouse: 'W1', tag: 'motor' })).toEqual([items[0]]);
  expect(filterItems(items, { query: 'ANALOG', status: 'all', category: '', warehouse: '', tag: '' })).toEqual([items[1]]);
});

it('derives stable display values and filter options', () => {
  expect(formatLocation(items[0])).toBe('W1 / S2 / P3');
  expect(formatLocation(items[1])).toBe('Assembly');
  expect(primaryImage(items[0])).toBe('/uploads/a.webp');
  expect(primaryImage(items[1])).toBe('');
  expect(uniqueFilterOptions(items)).toEqual({ categories: ['Control', 'Sensor'], warehouses: ['W1'], tags: ['analog', 'motor'] });
});

it('loads every API page with a limit of 100', async () => {
  const fetchImpl = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { items: [{ _id: '1' }], total: 2, page: 1, limit: 100 } }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { items: [{ _id: '2' }], total: 2, page: 2, limit: 100 } }) });
  await expect(fetchAllItems(fetchImpl)).resolves.toEqual([{ _id: '1' }, { _id: '2' }]);
  expect(fetchImpl).toHaveBeenNthCalledWith(1, '/api/items?page=1&limit=100', expect.any(Object));
  expect(fetchImpl).toHaveBeenNthCalledWith(2, '/api/items?page=2&limit=100', expect.any(Object));
});
```

- [ ] **Step 2: Run tests and verify missing-module failure**

Run: `npm run test:web -- client/src/lib/inventory.test.js`

Expected: FAIL because `api.js` and `inventory.js` do not exist.

- [ ] **Step 3: Implement the API and inventory utilities**

`apiRequest` must set `Accept: application/json`, avoid setting `Content-Type` for `FormData`, parse the stable envelope, and throw an `Error` whose message comes from `body.message` or `Request failed`. `fetchAllItems(fetchImpl = fetch)` must loop from page 1, append `data.items`, and stop when accumulated length reaches `data.total` or a page is empty.

`filterItems` must normalize strings with `String(value ?? '').trim().toLocaleLowerCase()`, search name/part number/description/owner/tags, and apply non-empty criteria. Sort unique filter values with `localeCompare`. `formatLocation` returns `warehouse / section / pack` for stored items and `delivered_to` for delivered items. `primaryImage` returns the first image path or `''`.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm run test:web -- client/src/lib/inventory.test.js`

Expected: PASS.

```powershell
git add client/src/lib
git commit -m "feat: add inventory data utilities"
```

### Task 3: Shared Item Form State, Validation, and Multipart Serialization

**Files:**
- Create: `client/src/features/item-form/item-form.js`
- Create: `client/src/features/item-form/item-form.test.js`
- Create: `client/src/features/item-form/ItemForm.vue`
- Create: `client/src/features/item-form/ImagePicker.vue`
- Create: `client/src/components/FeedbackMessage.vue`

**Interfaces:**
- Consumes: API item objects and browser `File`/`FormData`.
- Produces: `emptyItemForm()`, `itemToForm(item)`, `validateItemForm(form, files, retainedImageCount)`, `toItemFormData(form, files, removeImageIds)`, and `<ItemForm :initial-item :busy @submit @dirty-change />`.

- [ ] **Step 1: Write failing form-domain tests**

Create tests covering conditional state and multipart fields:

```js
import { describe, expect, it } from 'vitest';
import { emptyItemForm, itemToForm, toItemFormData, validateItemForm } from './item-form';

it('requires a full location only for stored items', () => {
  const form = { ...emptyItemForm(), name: 'Board', part_num: 'B-1', stored: true, location: { warehouse: 'W1', section: '', pack: 'P1' } };
  expect(validateItemForm(form, [], 0)).toMatchObject({ 'location.section': 'Section is required' });
  form.stored = false;
  form.delivered_to = 'Assembly';
  expect(validateItemForm(form, [], 0)).toEqual({});
});

it('maps an item without mutating it and serializes structured fields', () => {
  const item = { name: 'Board', part_num: 'B-1', stored: true, tags: ['control'], updates: [{ text: 'Checked' }], location: { warehouse: 'W1', section: 'S1', pack: 'P1' } };
  const form = itemToForm(item);
  form.name = 'Changed';
  expect(item.name).toBe('Board');
  const body = toItemFormData(form, [], ['image-id']);
  expect(JSON.parse(body.get('location'))).toEqual(item.location);
  expect(JSON.parse(body.get('tags'))).toEqual(['control']);
  expect(JSON.parse(body.get('removeImageIds'))).toEqual(['image-id']);
});

it('rejects excess, oversized, and unsupported images', () => {
  const form = { ...emptyItemForm(), name: 'Board', part_num: 'B-1', stored: false, delivered_to: 'Lab' };
  const bad = new File(['x'], 'notes.txt', { type: 'text/plain' });
  expect(validateItemForm(form, [bad], 10).images).toContain('maximum');
});
```

- [ ] **Step 2: Run the form tests and verify they fail**

Run: `npm run test:web -- client/src/features/item-form/item-form.test.js`

Expected: FAIL because the form module does not exist.

- [ ] **Step 3: Implement pure form behavior**

Use a stable form shape containing all model fields, `tagsText`, and `newUpdateText`. Validation returns a flat error object keyed by field path. Validate name, part number, conditional state fields, total image count, each file type against `image/jpeg`, `image/png`, `image/webp`, and size against `5 * 1024 * 1024`. `toItemFormData` appends scalar strings, boolean `stored`, JSON location/tags/updates/removeImageIds, and repeated `images` files; omit `location` for delivered items and `delivered_to` for stored items.

- [ ] **Step 4: Build the reusable form and image picker**

`ItemForm.vue` owns a cloned form, inline errors, error summary, conditional sections, and submit/dirty events. `ImagePicker.vue` uses:

```html
<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple>
```

It creates object-URL previews, revokes them on removal/unmount, emits selected files and existing-image removal IDs, and announces validation errors. `FeedbackMessage.vue` renders semantic success/error text with `role="status"` or `role="alert"`.

- [ ] **Step 5: Run tests and commit**

Run: `npm run test:web -- client/src/features/item-form/item-form.test.js`

Expected: PASS.

```powershell
git add client/src/features/item-form client/src/components/FeedbackMessage.vue
git commit -m "feat: add reusable inventory item form"
```

### Task 4: Modern Workbench Shell and Inventory Browse Page

**Files:**
- Modify: `client/src/App.vue`
- Modify: `client/src/router.js`
- Modify: `client/src/pages/InventoryPage.vue`
- Create: `client/src/styles.css`
- Create: `client/src/components/AppShell.vue`
- Create: `client/src/components/StatusBadge.vue`
- Create: `client/src/features/inventory/InventoryCard.vue`
- Create: `client/src/pages/InventoryPage.test.js`

**Interfaces:**
- Consumes: `fetchAllItems`, `filterItems`, `uniqueFilterOptions`, `formatLocation`, `primaryImage`.
- Produces: `/items` browse experience with search, status chips, category/warehouse/tag filters, retry, empty states, and responsive photo cards.

- [ ] **Step 1: Write the failing browse-page test**

Mock `fetchAllItems` with two items, mount `InventoryPage`, then assert search and status filtering:

```js
it('loads inventory and combines search with status filtering', async () => {
  fetchAllItems.mockResolvedValue([
    { _id: '1', name: 'Motor Controller', part_num: 'PCB-042', stored: true, tags: ['motor'], location: { warehouse: 'W1', section: 'S2', pack: 'P3' }, images: [] },
    { _id: '2', name: 'Sensor Board', part_num: 'SNS-018', stored: false, delivered_to: 'Assembly', tags: ['sensor'], images: [] }
  ]);
  const wrapper = mount(InventoryPage, { global: { plugins: [router] } });
  await flushPromises();
  expect(wrapper.text()).toContain('Motor Controller');
  await wrapper.get('[aria-label="Search inventory"]').setValue('sensor');
  expect(wrapper.text()).not.toContain('Motor Controller');
  expect(wrapper.text()).toContain('Sensor Board');
  await wrapper.get('[data-status="stored"]').trigger('click');
  expect(wrapper.text()).toContain('No items match');
});
```

- [ ] **Step 2: Run the test and verify the page lacks the behavior**

Run: `npm run test:web -- client/src/pages/InventoryPage.test.js`

Expected: FAIL because the placeholder page has no search control or cards.

- [ ] **Step 3: Implement the shell, cards, and browse state**

`AppShell.vue` provides brand navigation to Inventory and Add Item plus the routed main landmark. `InventoryPage.vue` owns `items`, criteria, loading, and error refs; derives visible items and filter options; calls `fetchAllItems` on mount and retry. `InventoryCard.vue` links to `/items/:id`, displays a deliberate PCB placeholder when `primaryImage` is empty, and shows stored/delivered text with `StatusBadge.vue`.

- [ ] **Step 4: Implement mobile-first design tokens and responsive layout**

Define CSS custom properties for cream, circuit green, lime, ink, muted text, borders, success, danger, radius, and shadow. Default to a single-column card list, 44-pixel controls, sticky compact navigation, visible `:focus-visible`, and no fixed widths. Add card columns at `min-width: 48rem` and `75rem`. Respect `prefers-reduced-motion`.

- [ ] **Step 5: Run browse tests and build, then commit**

Run:

```powershell
npm run test:web -- client/src/pages/InventoryPage.test.js
npm run build
```

Expected: PASS and successful offline asset build.

```powershell
git add client/src
git commit -m "feat: add mobile inventory browser"
```

### Task 5: Create Item Page

**Files:**
- Modify: `client/src/router.js`
- Create: `client/src/pages/CreateItemPage.vue`
- Create: `client/src/pages/CreateItemPage.test.js`

**Interfaces:**
- Consumes: `<ItemForm>`, `toItemFormData`, `apiRequest`, and Vue Router.
- Produces: `/items/new`; POSTs multipart data to `/api/items`; routes success to `/items/:id`.

- [ ] **Step 1: Write the failing creation-flow test**

Mock `apiRequest`, mount with router, fill the minimum delivered form, submit, and assert:

```js
expect(apiRequest).toHaveBeenCalledWith('/api/items', {
  method: 'POST',
  body: expect.any(FormData)
});
expect(router.currentRoute.value.fullPath).toBe('/items/new-id');
```

Also test that a rejected API request displays its message and keeps the user on `/items/new`.

- [ ] **Step 2: Run the creation test and verify it fails**

Run: `npm run test:web -- client/src/pages/CreateItemPage.test.js`

Expected: FAIL because `CreateItemPage.vue` does not exist.

- [ ] **Step 3: Implement the create route and page**

Render page heading/copy plus `ItemForm`. On submit, set `busy`, clear previous feedback, POST `toItemFormData`, and `router.push(`/items/${item._id}`)` after success. Catch errors into the shared feedback component and always clear `busy` in `finally`.

Track the form's dirty event. Register `onBeforeRouteLeave` and `beforeunload`; prompt only when dirty and not successfully submitted. Remove the browser listener on unmount.

- [ ] **Step 4: Run tests and commit**

Run: `npm run test:web -- client/src/pages/CreateItemPage.test.js`

Expected: PASS.

```powershell
git add client/src/router.js client/src/pages/CreateItemPage.vue client/src/pages/CreateItemPage.test.js
git commit -m "feat: add inventory data entry page"
```

### Task 6: Item Detail, Gallery, Editing, and History

**Files:**
- Modify: `client/src/router.js`
- Create: `client/src/pages/ItemDetailPage.vue`
- Create: `client/src/pages/ItemDetailPage.test.js`
- Create: `client/src/features/item-detail/ImageGallery.vue`
- Create: `client/src/features/item-detail/HistoryTimeline.vue`
- Create: `client/src/lib/dates.js`

**Interfaces:**
- Consumes: `apiRequest`, `<ItemForm>`, item image `_id`/`path`, and history records.
- Produces: `/items/:id` read/edit experience; `formatDate(value)`; accessible gallery/lightbox; chronological history timeline.

- [ ] **Step 1: Write failing detail and edit tests**

Mock GET with an item containing two images and history. Assert the page shows the large image, metadata, and history. Enter edit mode, emit the form submit payload, and assert:

```js
expect(apiRequest).toHaveBeenCalledWith('/api/items/item-1', {
  method: 'PATCH',
  body: expect.any(FormData)
});
```

Assert a second GET refreshes history after PATCH. Add a gallery test that thumbnail activation changes the primary image, opening the lightbox produces `role="dialog"`, Escape closes it, and focus returns to the opener.

- [ ] **Step 2: Run detail tests and verify missing components fail**

Run: `npm run test:web -- client/src/pages/ItemDetailPage.test.js`

Expected: FAIL because detail modules do not exist.

- [ ] **Step 3: Implement read, edit, and refresh behavior**

Load `/api/items/${route.params.id}` on mount and when the ID changes. Render loading, retry, and not-found/error states. Display gallery, status/location, metadata, update notes, and history. Toggle edit mode into `ItemForm`; PATCH multipart data, then GET the full detail record again to refresh history. Preserve edit state on failure and lock actions while busy.

Use the same unsaved-change route and `beforeunload` guards as creation. Only clear dirty state after successful PATCH or explicit cancel confirmation.

- [ ] **Step 4: Implement gallery, dates, and history accessibility**

`ImageGallery.vue` tracks the active index, uses buttons for thumbnails, opens a modal dialog with `aria-modal="true"`, closes on Escape/backdrop/close button, moves focus into the dialog, and restores trigger focus. When images are empty, render the PCB placeholder rather than a broken image.

`formatDate` returns `—` for invalid/missing input and otherwise uses `Intl.DateTimeFormat`. `HistoryTimeline.vue` sorts a copied array by ascending date and renders new-item, location/state transition, and deleted descriptions without exposing `[object Object]`.

- [ ] **Step 5: Run detail tests and commit**

Run: `npm run test:web -- client/src/pages/ItemDetailPage.test.js`

Expected: PASS.

```powershell
git add client/src/router.js client/src/pages/ItemDetailPage.vue client/src/pages/ItemDetailPage.test.js client/src/features/item-detail client/src/lib/dates.js
git commit -m "feat: add item detail and editing"
```

### Task 7: Guarded Soft Delete and Complete Verification

**Files:**
- Modify: `client/src/pages/ItemDetailPage.vue`
- Modify: `client/src/pages/ItemDetailPage.test.js`
- Create: `client/src/features/item-detail/DeleteItemDialog.vue`
- Modify: `README.md`

**Interfaces:**
- Consumes: item `{ _id, name, part_num }`, `apiRequest`, router.
- Produces: `<DeleteItemDialog :item :busy @confirm @close />`; guarded `DELETE /api/items/:id`; documented offline build/start workflow.

- [ ] **Step 1: Write failing guarded-delete tests**

Open the dialog and assert it shows name/part number, focuses the text field, and disables confirmation until the exact item name is entered. After the exact match, trigger delete and assert:

```js
expect(apiRequest).toHaveBeenCalledWith('/api/items/item-1', { method: 'DELETE' });
expect(router.currentRoute.value.fullPath).toBe('/items');
```

Add a rejection test: the dialog stays open, displays `Delete failed`, and re-enables controls. Assert Escape closes only when not busy and focus returns to the delete trigger.

- [ ] **Step 2: Run the delete tests and verify they fail**

Run: `npm run test:web -- client/src/pages/ItemDetailPage.test.js`

Expected: FAIL because the guarded dialog is absent.

- [ ] **Step 3: Implement the destructive confirmation flow**

Place a visually separated danger section after item content. `DeleteItemDialog.vue` requires `typedName === item.name`, uses `role="dialog"` and `aria-modal="true"`, traps Tab/Shift+Tab within its controls, closes on Escape only while idle, and restores focus on close. `ItemDetailPage` calls DELETE once, redirects only after success, and passes API errors back into the open dialog.

- [ ] **Step 4: Document local installation and offline operation**

Update `README.md` with these exact workflows:

```powershell
npm install
npm run dev:api
npm run dev:web
```

For production/offline deployment:

```powershell
npm install
npm run build
npm start
```

Explain that all dependencies must be installed or cached before moving the system offline, that the production browser makes no CDN requests, and that `public/` is generated by `npm run build`.

- [ ] **Step 5: Run the full verification suite**

Run:

```powershell
npm test
npm run build
git diff --check
```

Expected: all Jest and Vitest tests PASS, Vite creates `public/` successfully, and Git reports no whitespace errors.

Start the API and preview the production build. Manually verify at 375px and 1280px widths:

1. Create stored and delivered items, including camera/gallery image selection and validation.
2. Load all inventory, search each indexed field, combine every filter, clear filters, retry a simulated failure, and inspect empty states.
3. Open image gallery/lightbox, edit metadata, transition stored/delivered state, add/remove images, and confirm refreshed history.
4. Trigger unsaved-change warnings on create and edit.
5. Verify delete cannot run with a partial/wrong name, failure stays in-dialog, and success returns to inventory.
6. Keyboard through navigation, filters, form, gallery, and dialog; confirm visible focus, Escape behavior, and focus restoration.

- [ ] **Step 6: Commit the completed frontend**

```powershell
git add client/src/pages/ItemDetailPage.vue client/src/pages/ItemDetailPage.test.js client/src/features/item-detail/DeleteItemDialog.vue README.md
git commit -m "feat: add guarded inventory deletion"
```
