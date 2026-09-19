# PCB Lab Inventory Frontend

Mobile-first Vue 3 interface for the PCB Lab Inventory API. The root project owns dependencies, scripts, tests, and the production build. It does not load Vue, fonts, scripts, or styles from a CDN.

## Requirements

- Node.js 24 or newer
- The repository root installed with `npm install`

## Local development

From the repository root:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies API and upload requests to the backend on port 3000.

## Production build

```powershell
npm run build
npm start
```

The root server serves the generated `dist/` directory and the API from the same origin.

## Offline deployment

Install dependencies or prepare the npm cache before moving the server offline. After `npm run build`, the deployed browser uses only files in `dist/` and the configured API; it makes no CDN requests.
