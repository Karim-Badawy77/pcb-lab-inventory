# Frontend Stage 2: Under-Repair Item Creation

## Scope

Add creation-time support for the latest item/repairment API, plus read-only repairment visibility from item detail. Repairment editing remains out of scope. The API must accept the creation payload atomically so an under-repair item cannot be left with incomplete unit repairments.

## API additions

### Repairment model

Add `updates`, using the same subdocument shape as `Item.updates`: `{ text: String, createdAt: Date }[]`, defaulting to an empty array.

### Item creation payload

When `under_repairment` is true, accept a `repairments` JSON array in the item creation request. Each entry represents one physical unit and contains:

- optional `serial_num: String` for that unit, copied from the corresponding element of `item.serial_num[]` when provided;
- `status`, selected from `repaired`, `unrepairable`, `repairing`, or `awaiting_spare_part`;
- `field_test_date: Date[]`;
- `repairer: String[]`;
- `spare_part: { part: String, price: Number }[]`;
- `updates: { text: String, createdAt?: Date }[]`.

The service must validate that the repairment array length equals `quantity` when under repair. It creates one repairment document per unit; when an item serial exists at the same index, it copies that value into `repairment.serial_num`, otherwise the repairment serial remains absent. It performs item, repairment, and initial history writes in one transaction. Existing automatic quantity synchronization must not create duplicate repairments for this creation path. Non-repairing item creation continues without repairment documents.

## Creation UI

The new-item form adds a third inventory-state radio: `Under repair`, alongside `Stored` and `Delivered`. Under repair submits `under_repairment: true`, forces the displayed location to Lab, and hides editable warehouse, section, and pack fields.

The form adds API-aligned shared item fields: organization, type select (`pcb`, `module`, `else`), quantity, and serial numbers. When quantity is greater than one, it renders one independent unit card per quantity. Each card contains its own serial number and repairment fields: a status select dropdown with the four API values, field-test-date list, repairer list, structured spare-part rows, and update-note list.

The UI should preserve entered unit data when quantity increases or decreases where possible, remove only units beyond the new quantity, and validate every unit before submission. Required validation includes item name, positive quantity, one unit entry per quantity, valid repairment status, valid dates/prices, and required fields appropriate to the selected inventory state.

The multipart request sends the item fields normally and serializes `repairments` as JSON. The frontend does not issue follow-up repairment requests after item creation.

## Item detail repairment cards

When an item has repairments, the item detail page fetches and displays one read-only card per non-deleted repairment. Each card summarizes the unit serial number when present, status, repairer count, spare-part count, and latest update date. Every card links to `/repairments/:id`.

The repairment detail page is read-only and displays the complete repairment record, including status, serial number when present, field-test dates, repairers, structured spare parts, updates, and linked item context. It does not provide edit or delete controls in this stage.

## Component boundaries

- Keep item-level state and submission in `ItemForm`/`item-form.js`.
- Add a focused repeatable `RepairmentUnitFields` component for one unit card and its dynamic lists.
- Keep `CreateItemPage` responsible only for API submission and navigation.
- Do not expose the new repairment creation cards when the shared form is used for editing an existing item.
- Add dedicated read-only repairment card/detail components and route them independently from `ItemForm`.

## Verification

Add frontend tests for:

- the third state radio and Lab-only display;
- quantity-driven unit-card rendering and preservation;
- independent serial numbers and repairment fields per unit;
- dynamic dates, repairers, spare parts, and update notes;
- validation errors for incomplete unit cards;
- exact `FormData` contents, including `under_repairment` and JSON `repairments`;
- repairment model validation for `updates`.
- item detail repairment-card rendering, hidden deleted records, and links to repairment detail;
- read-only repairment detail rendering with linked item context.

Add backend integration tests for atomic item creation with one repairment per quantity and rollback when one repairment entry is invalid.
