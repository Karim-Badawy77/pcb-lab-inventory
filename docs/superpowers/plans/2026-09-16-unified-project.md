# Unified Backend and Frontend Project Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge backend and frontend package management and serve the built Vue application through Express without frontend backend-IP configuration.

**Architecture:** Keep Vue source and Vite configuration under `frontend/`, but move frontend dependencies and scripts into the root manifest. Express serves `frontend/dist` in production; `npm start` builds that directory when it is missing.

**Tech Stack:** Node.js, Express, Vue 3, Vite, Jest, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-16-unified-project-design.md`

## Global Constraints

- Keep Node.js `>=24.0.0`.
- Keep frontend API requests relative to the current origin.
- Keep `/api` and `/uploads` available under Express.

---

### Task 1: Merge package manifests and scripts

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Remove: `frontend/package.json`
- Remove: `frontend/package-lock.json`

- [ ] Add Vue/Vite dependencies and scripts to the root manifest, including `build`, `dev`, and `start` orchestration.
- [ ] Add `concurrently` as a root development dependency for running the API and Vite together.
- [ ] Regenerate the root lockfile with `npm install`.
- [ ] Confirm `npm run build` resolves the existing `frontend/vite.config.js`.

### Task 2: Add automatic frontend build and static serving

**Files:**
- Create: `scripts/start.js`
- Modify: `src/app.js`

- [ ] Make `scripts/start.js` check for `frontend/dist/index.html`; if absent, run `npm run build`, then require `src/server.js`.
- [ ] Serve `frontend/dist` from Express after API/upload routes are registered.
- [ ] Add a fallback for non-API, non-upload GET requests to `frontend/dist/index.html` so Vue Router routes work on refresh.
- [ ] Leave API and upload 404/error handling intact.

### Task 3: Verify the unified workflow

**Files:**
- Test: existing backend and frontend test suites

- [ ] Run `npm test` and confirm backend tests pass.
- [ ] Run `npm run test:frontend` and confirm frontend tests pass.
- [ ] Run `npm run build` and confirm `frontend/dist/index.html` is generated.
- [ ] Run a production smoke check against the built app and confirm `/`, a Vue route, `/api/health`, and `/uploads` resolve through the same server.
