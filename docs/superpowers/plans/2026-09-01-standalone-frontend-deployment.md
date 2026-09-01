# Standalone Frontend Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the completed Vue UI into an independently installable and deployable `frontend/` project while keeping the root Express project API-only.

**Architecture:** The root package owns Express, MongoDB, uploads, CORS, and Jest tests. `frontend/` owns Vue, Vue Router, Vite, Vitest, its lockfile, runtime `config.js`, and static build output; its API and image URLs resolve from `window.APP_CONFIG.API_BASE_URL`.

**Tech Stack:** Node.js 24+, Express 5, CORS middleware, Vue 3, Vue Router 4, Vite, Vitest, Vue Test Utils, jsdom, Jest, Supertest

**Spec:** `docs/superpowers/specs/2026-09-01-vue-inventory-frontend-design.md`

## Global Constraints

- The frontend must live entirely under `frontend/` with its own `package.json` and `package-lock.json`.
- The root project must remain deployable as an API without installing frontend dependencies.
- The frontend must remain deployable as static files without installing API dependencies.
- Runtime API configuration is `window.APP_CONFIG.API_BASE_URL` from `frontend/public/config.js`; changing `dist/config.js` must not require rebuilding.
- The API allows every CORS origin, including preflight, JSON, multipart, deletion, and `/uploads` access.
- Local same-machine testing uses API port `3000` and frontend port `5173` as separate processes.
- Browser production runtime must not fetch Vue, fonts, scripts, or styles from a CDN.
- Existing mobile-first UI behavior, accessibility, tests, and Modern Workbench styling must remain intact.

---

### Task 1: Move the Vue Application into an Independent Package

**Files:**
- Move: `client/index.html` → `frontend/index.html`
- Move: `client/vite.config.js` → `frontend/vite.config.js`
- Move: `client/src/**` → `frontend/src/**`
- Create: `frontend/package.json`
- Create: `frontend/package-lock.json`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: current `client/` Vue application and its 18 Vitest tests.
- Produces: standalone frontend scripts `dev`, `build`, `test`; API-only root scripts `start`, `dev`, `test`, `test:watch`.

- [ ] **Step 1: Record the existing frontend regression baseline**

Run from the repository root:

```powershell
npm run test:web
npm run build
```

Expected: 5 Vitest files and 18 tests PASS; Vite emits the current integrated build.

- [ ] **Step 2: Move the frontend tree with Git history preserved**

Run:

```powershell
git mv client frontend
```

Remove any generated `public/` directory; it is ignored and not source. Change `frontend/vite.config.js` build output from `../public` to `dist`:

```js
build: { outDir: 'dist', emptyOutDir: true }
```

- [ ] **Step 3: Create the independent frontend manifest and lockfile**

Create `frontend/package.json`:

```json
{
  "name": "pcb-lab-inventory-frontend",
  "version": "1.0.0",
  "private": true,
  "engines": { "node": ">=24.0.0" },
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "vue": "^3.5.42",
    "vue-router": "^4.6.3"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.8",
    "@vue/test-utils": "^2.5.0",
    "jsdom": "^30.0.1",
    "vite": "^8.2.2",
    "vitest": "^4.1.11"
  }
}
```

Run `npm install` inside `frontend/` to generate `frontend/package-lock.json`.

- [ ] **Step 4: Return the root package to API-only dependencies**

From the root, uninstall `vue`, `vue-router`, `vite`, `@vitejs/plugin-vue`, `vitest`, `@vue/test-utils`, and `jsdom`. Restore root scripts to:

```json
{
  "start": "node src/server.js",
  "dev": "node --watch src/server.js",
  "test": "jest --runInBand",
  "test:watch": "jest --watch"
}
```

Remove the temporary Jest `/client/` ignore because frontend tests are no longer inside the root dependency/test boundary. Update `.gitignore` to ignore `frontend/node_modules/`, `frontend/dist/`, and `.superpowers/`; remove `public/` unless another API feature needs it.

- [ ] **Step 5: Verify both dependency boundaries independently**

Run:

```powershell
npm test
Set-Location frontend
npm test
npm run build
Set-Location ..
```

Expected: 4 API suites/18 tests PASS; 5 frontend files/18 tests PASS; build output appears only in `frontend/dist/`.

- [ ] **Step 6: Commit the package separation**

```powershell
git add .gitignore package.json package-lock.json frontend
git commit -m "refactor: separate Vue frontend package"
```

### Task 2: Runtime API and Image URL Configuration

**Files:**
- Create: `frontend/public/config.js`
- Create: `frontend/src/lib/config.js`
- Create: `frontend/src/lib/config.test.js`
- Modify: `frontend/index.html`
- Modify: `frontend/src/lib/api.js`
- Modify: `frontend/src/lib/inventory.js`
- Modify: `frontend/src/lib/inventory.test.js`

**Interfaces:**
- Consumes: `window.APP_CONFIG.API_BASE_URL`, API paths such as `/api/items`, image paths such as `/uploads/file.webp`.
- Produces: `apiBaseUrl()`, `apiUrl(path)`, `assetUrl(path)`; `apiRequest` and `fetchAllItems` use absolute configured URLs; `primaryImage(item)` returns a deployable image URL.

- [ ] **Step 1: Write failing runtime configuration tests**

Create `frontend/src/lib/config.test.js`:

```js
import { afterEach, describe, expect, it } from 'vitest';
import { apiBaseUrl, apiUrl, assetUrl } from './config';

afterEach(() => { delete window.APP_CONFIG; });

describe('runtime deployment configuration', () => {
  it('normalizes a configured API base URL', () => {
    window.APP_CONFIG = { API_BASE_URL: 'https://api.example.test/' };
    expect(apiBaseUrl()).toBe('https://api.example.test');
    expect(apiUrl('/api/items')).toBe('https://api.example.test/api/items');
    expect(assetUrl('/uploads/board.webp')).toBe('https://api.example.test/uploads/board.webp');
  });

  it('supports same-origin paths when the base is empty', () => {
    window.APP_CONFIG = { API_BASE_URL: '' };
    expect(apiUrl('/api/items')).toBe('/api/items');
    expect(assetUrl('https://cdn.example.test/board.webp')).toBe('https://cdn.example.test/board.webp');
  });
});
```

Update the existing inventory test to set `window.APP_CONFIG = { API_BASE_URL: 'http://localhost:3000' }`, expect `primaryImage(items[0])` to equal `http://localhost:3000/uploads/a.webp`, and expect paginated fetch calls to target `http://localhost:3000/api/items?page=1&limit=100` and page 2.

- [ ] **Step 2: Run tests and verify the missing runtime module failure**

Run from `frontend/`:

```powershell
npm test -- src/lib/config.test.js src/lib/inventory.test.js
```

Expected: FAIL because `config.js` does not exist and image URLs remain relative.

- [ ] **Step 3: Implement runtime configuration and URL joining**

Create `frontend/src/lib/config.js`:

```js
export function apiBaseUrl() {
  return String(window.APP_CONFIG?.API_BASE_URL || '').trim().replace(/\/+$/, '');
}

export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = `/${String(path || '').replace(/^\/+/, '')}`;
  return `${apiBaseUrl()}${normalizedPath}`;
}

export function assetUrl(path) {
  if (!path) return '';
  return apiUrl(path);
}
```

Import `apiUrl` into `api.js` and call `fetchImpl(apiUrl(path), options)`. Import `assetUrl` into `inventory.js` and return `assetUrl(item.images[0].path)` from `primaryImage`.

- [ ] **Step 4: Load editable configuration before Vue**

Create `frontend/public/config.js`:

```js
window.APP_CONFIG = {
  API_BASE_URL: "http://localhost:3000"
};
```

Add `<script src="/config.js"></script>` before `<script type="module" src="/src/main.js"></script>` in `frontend/index.html`.

- [ ] **Step 5: Verify runtime behavior and built artifact order**

Run from `frontend/`:

```powershell
npm test
npm run build
Select-String -Path dist\index.html -Pattern 'config.js'
Get-Content -Raw dist\config.js
```

Expected: all frontend tests PASS; `dist/index.html` loads `config.js`; `dist/config.js` contains editable `API_BASE_URL`; no CDN URLs appear in generated HTML.

- [ ] **Step 6: Commit runtime deployment configuration**

```powershell
git add frontend
git commit -m "feat: add runtime API configuration"
```

### Task 3: API-Only Express Application with Permissive CORS

**Files:**
- Modify: `src/app.js`
- Modify: `tests/app.test.js`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: HTTP `Origin` header and browser preflight requests.
- Produces: `Access-Control-Allow-Origin: *`; API-only JSON 404s for frontend-looking routes; unchanged `/api/items` and `/uploads` behavior.

- [ ] **Step 1: Replace SPA-hosting coverage with failing CORS/API-only tests**

Replace the temporary directory SPA test in `tests/app.test.js` with:

```js
test('allows any CORS origin and handles preflight', async () => {
  const app = createApp();
  const response = await request(app).get('/missing').set('Origin', 'https://frontend.example.test');
  expect(response.headers['access-control-allow-origin']).toBe('*');

  const preflight = await request(app).options('/api/items')
    .set('Origin', 'https://another.example.test')
    .set('Access-Control-Request-Method', 'POST');
  expect(preflight.status).toBe(204);
  expect(preflight.headers['access-control-allow-origin']).toBe('*');
});

test('does not serve frontend routes', async () => {
  const response = await request(createApp()).get('/items/new');
  expect(response.status).toBe(404);
  expect(response.type).toMatch(/json/);
  expect(response.body).toEqual({ success: false, message: 'Route not found' });
});
```

- [ ] **Step 2: Run the API test and verify it fails for missing CORS**

Run: `npm test -- --runTestsByPath tests/app.test.js`

Expected: FAIL because the response has no `Access-Control-Allow-Origin` header.

- [ ] **Step 3: Install CORS and remove frontend hosting from Express**

Run from root:

```powershell
npm install cors
```

Change `createApp` back to a no-argument API factory and register CORS before routes:

```js
const cors = require('cors');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(path.resolve('uploads')));
  app.use('/api/items', itemRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 4: Run focused and full API verification**

Run:

```powershell
npm test -- --runTestsByPath tests/app.test.js
npm test
```

Expected: focused tests PASS; all 4 API suites and 19 or more tests PASS.

- [ ] **Step 5: Commit the API deployment boundary**

```powershell
git add src/app.js tests/app.test.js package.json package-lock.json
git commit -m "feat: allow standalone frontend origins"
```

### Task 4: Independent Operations Documentation and End-to-End Verification

**Files:**
- Modify: `README.md`
- Create: `frontend/README.md`

**Interfaces:**
- Consumes: root and frontend scripts, `frontend/dist/config.js`, ports 3000/5173.
- Produces: exact install, test, development, build, runtime configuration, and independent deployment instructions.

- [ ] **Step 1: Rewrite root documentation as API-only instructions**

The root README must show:

```powershell
npm install
npm test
npm start
```

State that the API listens on `http://localhost:3000`, allows all CORS origins, serves uploads from `/uploads`, and does not serve the Vue SPA.

- [ ] **Step 2: Document the standalone frontend**

Create `frontend/README.md` with:

```powershell
cd frontend
npm install
npm test
npm run dev
```

For production:

```powershell
cd frontend
npm install
npm run build
```

Explain that `dist/` can be deployed to a static server, SPA routes need an `index.html` fallback, and `dist/config.js` can be edited to point at a new API without rebuilding.

- [ ] **Step 3: Verify both projects from clean dependency boundaries**

Run from root:

```powershell
npm test
Set-Location frontend
npm test
npm run build
Set-Location ..
git diff --check
```

Expected: API and frontend suites PASS independently, frontend build succeeds under `frontend/dist/`, and Git reports no whitespace errors.

- [ ] **Step 4: Verify same-machine development in a browser**

Start `npm run dev` from the root and from `frontend/` in separate terminals. Open `http://localhost:5173/items` and confirm requests target `http://localhost:3000/api/items`. At 375px and 1280px, verify create, browse, detail, edit, gallery, and guarded delete render without horizontal overflow or Vite overlays.

- [ ] **Step 5: Commit documentation and handoff**

```powershell
git add README.md frontend/README.md
git commit -m "docs: explain independent frontend deployment"
```
