# PCB Lab Inventory API

REST API for physical PCB-lab inventory items, local image uploads, soft deletion, and automatic transaction history. It uses CommonJS, Express, Mongoose, and MongoDB database `pcb-inventory`.

## Requirements

- Node.js 24 or newer
- A MongoDB deployment configured as a replica set (transactions do not work on a standalone server)

## Setup

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Configure `.env`:

```dotenv
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/pcb-inventory
MAX_IMAGE_COUNT=10
MAX_IMAGE_SIZE_BYTES=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
```

Uploaded files are stored in `uploads/` and served from `/uploads/<filename>`.

The API listens on `http://localhost:3000` by default and allows requests from any CORS origin. It does not serve the Vue application; the independently deployable frontend is documented in [`frontend/README.md`](frontend/README.md).

## Frontend

The Vue interface is a separate project under `frontend/`. To run both projects on one machine for development, start the API here:

```powershell
npm install
npm test
npm start
```

Then start Vite from `frontend/` in another terminal. The API and frontend keep separate dependencies, tests, and deployment lifecycles.

## API

| Method | Route | Behavior |
|---|---|---|
| `POST` | `/api/items` | Create an item and its initial history transaction |
| `GET` | `/api/items` | List active items with pagination |
| `GET` | `/api/items/:id` | Get one item with its transaction history |
| `PATCH` | `/api/items/:id` | Update metadata, state, updates, tags, or images |
| `DELETE` | `/api/items/:id` | Soft-delete and write `to: "deleted"` history |

List query parameters are `page` (default `1`), `limit` (default `20`, maximum `100`), and `includeDeleted=true`. Item lookup also accepts `includeDeleted=true`.

### Create with two images

```bash
curl -X POST http://localhost:3000/api/items \
  -F "name=Controller board" \
  -F "part_num=PCB-001" \
  -F "stored=true" \
  -F 'location={"warehouse":"W1","section":"S2","pack":"P3"}' \
  -F 'tags=["controller","pcb"]' \
  -F "images=@front.png" \
  -F "images=@back.png"
```

All fields may be sent as multipart fields. `location`, `tags`, `updates`, and `removeImageIds` must be JSON when sent via multipart.

### Edit metadata

```bash
curl -X PATCH http://localhost:3000/api/items/ITEM_ID \
  -H "Content-Type: application/json" \
  -d '{"description":"Inspected and labeled","tags":["controller","tested"]}'
```

Metadata changes do not create history transactions.

### Deliver and return an item

```bash
curl -X PATCH http://localhost:3000/api/items/ITEM_ID \
  -H "Content-Type: application/json" \
  -d '{"stored":false,"delivered_to":"Assembly Lab"}'

curl -X PATCH http://localhost:3000/api/items/ITEM_ID \
  -H "Content-Type: application/json" \
  -d '{"stored":true,"location":{"warehouse":"W1","section":"S2","pack":"P4"}}'
```

Delivering clears `location`; returning to storage clears `delivered_to`. Both operations create history.

### Remove one image

```bash
curl -X PATCH http://localhost:3000/api/items/ITEM_ID \
  -F 'removeImageIds=["IMAGE_SUBDOCUMENT_ID"]'
```

New images can be appended in the same request using repeated `images` fields.

### Read and delete

```bash
curl http://localhost:3000/api/items/ITEM_ID
curl "http://localhost:3000/api/items?page=1&limit=20"
curl -X DELETE http://localhost:3000/api/items/ITEM_ID
curl "http://localhost:3000/api/items?includeDeleted=true"
```

## Responses

Successful responses use `{ "success": true, "data": ... }`. Errors use `{ "success": false, "message": "..." }` and may include validation details.

## Tests

```powershell
npm test
```

Tests use `mongodb-memory-server` in replica-set mode. Its first run downloads a MongoDB binary and can therefore take several minutes.
