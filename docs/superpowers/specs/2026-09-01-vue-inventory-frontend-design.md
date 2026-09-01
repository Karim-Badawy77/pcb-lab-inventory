# Vue Inventory Frontend Design

## Goal

Add a mobile-first web interface to the existing PCB Lab Inventory API. The interface will let lab staff create inventory records, browse and filter active records, inspect individual items with large images, edit their data and inventory state, and soft-delete an item through a guarded confirmation flow.

The first version performs search and filtering entirely in the browser. It does not add authentication, server-side search, or new persistent state.

## Technical Approach

The frontend will be a standalone project under `frontend/`, with its own `package.json`, dependency lockfile, Vite configuration, tests, and deployment instructions. It will use Vue 3 and Vue Router installed locally through npm. All runtime assets will be compiled into the frontend deployment, so the lab system remains fully functional without internet access.

Vue source files will live under `frontend/src/`. During development, Vite will serve the frontend with fast module reloads. The production build will emit static assets under `frontend/dist/`, which can be deployed to any static web server independently from the API.

The root Node project remains API-only. Express will not serve frontend assets or SPA fallbacks. It will enable CORS for every origin so a separately hosted frontend can call JSON, multipart, deletion, and uploaded-image routes.

Runtime frontend configuration will be loaded before the Vue entry point from `frontend/public/config.js`:

```js
window.APP_CONFIG = {
  API_BASE_URL: "http://localhost:3000"
};
```

Vite copies this file to `dist/config.js`. An operator can change `API_BASE_URL` after building without recompiling. API requests and uploaded-image URLs will both resolve against this normalized base URL. An empty base URL remains valid for a reverse-proxied same-origin deployment.

For local testing on one machine, Express runs on port `3000` and Vite runs on port `5173`. These are independent processes and projects; no combined process manager is required.

## Routes

- `/items/new` — create a new inventory item.
- `/items` — browse, search, and filter active inventory.
- `/items/:id` — view, edit, update state, inspect history, manage images, and soft-delete one item.
- `/` — redirect to `/items`.

Unknown frontend paths will show a small client-side not-found view. API paths will continue to use the server's JSON 404 behavior and must not fall through to the SPA.

## Frontend Structure

Frontend source files will be organized by responsibility under `frontend/src/`:

- Application bootstrap and route definitions.
- A small API client that owns response-envelope handling and request errors.
- Page components for create, browse, detail, and not-found views.
- Reusable components for the application shell, item form, image picker, image gallery/lightbox, status badge, feedback messages, and delete confirmation.
- Pure utilities for validation, multipart serialization, search/filtering, date and location formatting, and image constraints.
- One shared stylesheet with the mobile-first responsive design system.

Vite configuration, the frontend HTML entry point, runtime configuration, `package.json`, and `package-lock.json` will live under `frontend/`. The root lockfile will contain only API dependencies. Each project can be installed, tested, and deployed without installing the other project's dependencies.

Components will use explicit props and events. API calls and route-level loading belong to page components; shared components remain focused on display and user interaction.

## Visual Direction

The selected direction is **Modern Workbench**:

- Warm off-white page surfaces.
- Deep circuit green navigation and headings.
- Lime primary actions and focus accents.
- Strong, practical typography with clear hierarchy.
- Status colors that remain readable and do not rely on color alone.
- Large touch targets and restrained borders rather than dense admin-dashboard chrome.

The UI is mobile-first. Forms begin as one column, inventory uses image-led cards, and navigation remains thumb-friendly. Tablet and desktop widths progressively add horizontal grouping, wider content bounds, and a multi-column inventory grid without changing the workflow.

## Page 1: Data Entry

The create page uses a single-column form divided into progressive sections:

1. Identity: name and part number.
2. Inventory state: stored or delivered.
3. Conditional state fields:
    - Stored items require warehouse, section, and pack.
    - Delivered items require delivered-to and may include delivered-by.
4. Classification: category and owner.
5. Description, tags, and update notes.
6. Images.

The image picker will work with mobile camera and gallery selection through the standard file input, accept multiple images, show local previews, and allow removal before submission. It will enforce the server-configured defaults exposed to the frontend design: up to 10 JPEG, PNG, or WebP images, each no larger than 5 MB. Server validation remains authoritative.

The form validates required and conditional fields before submission. It sends `FormData`; structured fields such as location, tags, and updates are JSON-encoded to match the existing controller contract. The submit button locks while saving. Success routes directly to the new item's detail page.

## Page 2: Inventory Browse

The browse page loads all active records from the paginated API by requesting `limit=100` pages until the accumulated records reach the response's reported `total`. Search and filtering then operate on this complete in-memory set.

Search is case-insensitive and matches:

- Name.
- Part number.
- Description.
- Owner.
- Tags.

Filters include:

- Inventory status: all, stored, or delivered.
- Category.
- Warehouse/location.
- Tags.

The selected presentation is **Photo cards**. Each card leads with the first image, then shows name, part number, status, and either storage location or delivery destination. Items without images use a deliberate PCB-themed placeholder. Mobile shows one card per row; wider screens progressively add columns.

The page provides loading skeletons, result count, clear-filter action, no-inventory and no-match states, and a manual retry if any API page fails. A prominent add action links to `/items/new`.

## Page 3: Item Detail and Editing

The detail page leads with a large, touch-friendly image gallery. Thumbnails or pagination indicators select images, and tapping the current image opens a full-screen lightbox. The page then presents current inventory status, location or delivery destination, metadata, update notes, and chronological transaction history.

Editing reuses the same field structure, conditional state rules, validation, and serialization logic as creation. Existing images can be marked for removal and new images appended in one multipart update. Inventory-state changes use the existing API behavior and automatically appear in transaction history after refresh.

The page warns before navigation when editable data or image selections are unsaved. Save controls lock while a request is active and report success without discarding the current context.

## Guarded Deletion

The item detail page includes a visually separated destructive action. Activating it opens a confirmation dialog that:

- Explains that the item will disappear from the active inventory.
- Shows the target item name and part number.
- Requires the user to type the exact item name.
- Keeps the delete button disabled until the name matches.
- Locks submission while the request is active.

The frontend calls the existing `DELETE /api/items/:id` soft-delete endpoint. It redirects to `/items` only after success. API failures keep the dialog open and display the server message.

## Error Handling and Accessibility

Field validation appears beside the affected control and in a concise summary at the top of the form. Network and API errors use a consistent feedback component, with the server's stable error message when available. Loading, empty, success, and failure states are explicit.

All interactive controls will be keyboard reachable, have visible focus treatment, and use semantic labels. Dialog focus will be contained while open and returned to its trigger when closed. Images use meaningful alternative text, status includes text labels, touch targets are at least 44 pixels, and layouts will not require horizontal scrolling at supported phone widths.

## Data Flow

The REST API remains the single source of truth. A configuration utility reads and normalizes `window.APP_CONFIG.API_BASE_URL`. The API client builds every request URL from that value, and the image-display utility converts relative `/uploads/...` paths into absolute URLs using the same base. Route pages fetch their required data on entry. The browse page owns its fetched collection and derives visible items from search and filter state. Create and detail pages own form state and delegate validation and multipart construction to shared pure utilities.

Successful mutations use the returned API record rather than guessing the server result. The detail page refreshes its full record after state-changing updates when transaction history must be refreshed.

## Testing and Verification

Pure JavaScript and Vue behavior will be covered by Vitest inside `frontend/`, including:

- Case-insensitive multi-field search.
- Combined status, category, location, and tag filtering.
- Conditional stored/delivered validation.
- Multipart field serialization and image-removal IDs.
- Formatting fallbacks for missing images, locations, and optional metadata.
- Runtime API and image URL resolution for configured, empty, and trailing-slash base URLs.

Express integration tests will verify:

- CORS permits requests from arbitrary origins and handles preflight requests.
- Frontend routes are not served by the API.
- `/api` unknown routes retain JSON 404 behavior rather than returning HTML.

Both projects' test commands and the frontend production build command will be part of verification. Tests must not fetch external scripts or other network-hosted runtime assets. The built `dist/index.html` must load `config.js` before the compiled Vue entry point.

Manual verification will cover create, browse/filter, edit/state change, image add/remove/lightbox, guarded delete, error recovery, and unsaved-change behavior at representative phone and desktop widths.

## Out of Scope

- Authentication and user roles.
- Server-side search or filter query parameters.
- Offline-first caching or service workers.
- Restoring or browsing soft-deleted items in the UI.
- TypeScript or a third-party component framework.
