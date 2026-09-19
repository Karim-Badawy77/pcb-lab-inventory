# Unified Backend and Frontend Project Design

## Goal

Use one root `package.json` for the Express API and Vue frontend, while serving the built frontend from Express so the browser never needs a separately configured backend IP.

## Architecture

The Vue source remains in `frontend/`, and Vite continues to provide the development server and `/api` and `/uploads` proxy. The root project owns all dependencies and scripts. In production, `npm start` builds the frontend when `frontend/dist` is absent, then Express serves the static build and falls back to `index.html` for client-side routes.

## Requirements

- Preserve the existing backend and frontend test commands.
- Preserve relative frontend API and upload URLs.
- Keep the development proxy targeting `http://localhost:3000`.
- Make `npm start` automatically build the frontend if needed.
- Serve the frontend and API from the same origin in production.
- Remove the nested frontend package manifest and lockfile after dependencies are merged.

## Verification

Run the backend tests, frontend tests, and a production frontend build. Confirm the generated `frontend/dist` is served by the Express application and that unknown non-API routes return the Vue entry point.
