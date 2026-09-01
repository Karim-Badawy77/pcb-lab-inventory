# PCB Lab Inventory Frontend

Mobile-first Vue 3 interface for the PCB Lab Inventory API. This directory is an independent project with its own dependencies, tests, and production build. It does not load Vue, fonts, scripts, or styles from a CDN.

## Requirements

- Node.js 24 or newer
- A reachable PCB Lab Inventory API

## Local development

Start the API from the repository root on port 3000:

```powershell
npm install
npm start
```

In a second terminal, start the frontend:

```powershell
cd frontend
npm install
npm test
npm run dev
```

Open `http://localhost:5173`. The default runtime configuration calls the API at `http://localhost:3000`, so both processes can run on the same machine while remaining separate deployments.

## Runtime API configuration

The browser reads `window.APP_CONFIG.API_BASE_URL` from `public/config.js` before Vue starts:

```js
window.APP_CONFIG = {
  API_BASE_URL: "http://localhost:3000"
};
```

The value must be the API origin without `/api/items`. It is used for both API requests and `/uploads` images. An empty string uses same-origin paths, which is useful behind a reverse proxy.

## Production build

```powershell
cd frontend
npm install
npm test
npm run build
```

Deploy the generated `dist/` directory to a static web server. Configure that server to return `index.html` for client-side routes such as `/items/new` and `/items/:id`.

Vite copies `public/config.js` to `dist/config.js`. You can edit `dist/config.js` after building to point the same build at another API server:

```js
window.APP_CONFIG = {
  API_BASE_URL: "https://inventory-api.example.com"
};
```

No recompilation is needed after this change. The API permits cross-origin requests.

## Offline deployment

Install dependencies or prepare the npm cache before moving the server offline. After `npm run build`, the deployed browser uses only files in `dist/` and the configured API; it makes no CDN requests.
