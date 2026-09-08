# PCB Lab Inventory

PCB Lab Inventory catalogs physical PCB-lab items, tracks storage or delivery state, records repairments, stores images, and maintains transaction history.

The repository contains two independently runnable projects:

- `src/` — Express, Mongoose, and MongoDB REST API
- `frontend/` — Vue 3 and Vue Router interface

## Requirements

- Node.js 24 or newer
- MongoDB configured as a replica set; transactions require replica-set support

## Run locally

```powershell
npm install
npm start
```

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend defaults to `http://localhost:3000` for the API. Configure another origin in `frontend/public/config.js`:

```js
window.APP_CONFIG = { API_BASE_URL: "http://localhost:3000" };
```

## Inventory features

Items support names, optional part numbers, quantity, owner, organization, type, tags, descriptions, update notes, images, soft deletion, and transaction history. Items can be stored, delivered, or under repair.

For stored items, warehouse is required while section and pack are optional. For delivered items, `delivered_to` is required. Part number and other metadata are optional. Images accept JPEG, PNG, and WebP files, with a maximum of 10 images and 5 MB per image.

Under-repair items remain stored in the lab and can contain one repairment record per quantity unit, including optional serial numbers and repairment information.

## Repairment features

Repairments belong to an item and require only a status: `repairing`, `awaiting_spare_part`, `repaired`, or `unrepairable`. Serial number, field-test dates, repairers, spare parts, prices, and update notes are optional. Repairments have dedicated details, edit, and soft-delete flows.

## Frontend routes

| Route | Purpose |
|---|---|
| `/items` | Inventory list |
| `/items/new` | Add an item |
| `/items/:id` | Item details, quantity, history, images, and repairments |
| `/items/:id/edit` | Edit an item |
| `/items/:itemId/repairments/new` | Add a repairment |
| `/repairments/:id` | Repairment details |
| `/repairments/:id/edit` | Edit a repairment |

Item detail repairment cards show only serial number and status; selecting a card opens full repairment details.

## API endpoints

### Items

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/items` | Create an item |
| `GET` | `/api/items` | List active items with pagination |
| `GET` | `/api/items/:id` | Get an item with history |
| `PATCH` | `/api/items/:id` | Update item fields, state, or images |
| `DELETE` | `/api/items/:id` | Soft-delete an item |

List parameters are `page`, `limit` (maximum 100), and `includeDeleted=true`.

### Repairments

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/repairments/item/:itemId` | Create a repairment |
| `GET` | `/api/repairments/item/:itemId` | List an item’s repairments |
| `GET` | `/api/repairments/:id` | Get a repairment |
| `PATCH` | `/api/repairments/:id` | Update a repairment |
| `DELETE` | `/api/repairments/:id` | Soft-delete a repairment |

Successful responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "message": "..." }`.

## Configuration

Create a root `.env` file as needed:

```dotenv
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/pcb-inventory
MAX_IMAGE_COUNT=10
MAX_IMAGE_SIZE_BYTES=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
```

Uploaded files are stored in `uploads/` and served from `/uploads/<filename>`.

## Tests and production build

API:

```powershell
npm test
```

Frontend:

```powershell
cd frontend
npm test
npm run build
```

The production frontend is written to `frontend/dist/`. Configure the static server to fall back to `index.html` for client-side routes.
