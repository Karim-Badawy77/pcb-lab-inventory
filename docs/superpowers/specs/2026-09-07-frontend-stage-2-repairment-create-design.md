# Frontend Stage 2: Under-Repair Item Creation

## Scope

Add creation-time support for the latest item/repairment API. Existing item editing and item-detail repairment management remain out of scope. The API must accept the creation payload atomically so an under-repair item cannot be left with incomplete unit repairments.

## API additions

### Repairment model

Add `updates`, using the same subdocument shape as `Item.updates`: `{ text: String, createdAt: Date }[]`, defaulting to an empty array.

### Item creation payload

When `under_repairment` is true, accept a `repairments` JSON array in the item creation request. Each entry represents one physical unit and contains:

- `serial_num: String` for that unit;
- `status`;
- `field_test_date: Date[]`;
- `repairer: String[]`;
- `spare_part: { part: String, price: Number }[]`;
- `updates: { text: String, createdAt?: Date }[]`.

The service must validate that the repairment array length equals `quantity` when under repair, create one repairment document per entry, and perform item, repairment, and initial history writes in one transaction. Existing automatic quantity synchronization must not create duplicate repairments for this creation path. Non-repairing item creation continues without repairment documents.

## Creation UI

The new-item form adds a third inventory-state radio: `Under repair`, alongside `Stored` and `Delivered`. Under repair submits `under_repairment: true`, forces the displayed location to Lab, and hides editable warehouse, section, and pack fields.

The form adds API-aligned shared item fields: organization, type select (`pcb`, `module`, `else`), quantity, and serial numbers. When quantity is greater than one, it renders one independent unit card per quantity. Each card contains its own serial number and repairment fields: status, field-test-date list, repairer list, structured spare-part rows, and update-note list.

The UI should preserve entered unit data when quantity increases or decreases where possible, remove only units beyond the new quantity, and validate every unit before submission. Required validation includes item name, positive quantity, one unit entry per quantity, valid repairment status, valid dates/prices, and required fields appropriate to the selected inventory state.

The multipart request sends the item fields normally and serializes `repairments` as JSON. The frontend does not issue follow-up repairment requests after item creation.

## Component boundaries

- Keep item-level state and submission in `ItemForm`/`item-form.js`.
- Add a focused repeatable `RepairmentUnitFields` component for one unit card and its dynamic lists.
- Keep `CreateItemPage` responsible only for API submission and navigation.
- Do not expose the new repairment cards when the shared form is used for editing an existing item.

## Verification

Add frontend tests for:

- the third state radio and Lab-only display;
- quantity-driven unit-card rendering and preservation;
- independent serial numbers and repairment fields per unit;
- dynamic dates, repairers, spare parts, and update notes;
- validation errors for incomplete unit cards;
- exact `FormData` contents, including `under_repairment` and JSON `repairments`;
- repairment model validation for `updates`.

Add backend integration tests for atomic item creation with one repairment per quantity and rollback when one repairment entry is invalid.
