# API Stage 2: Item Metadata, Repairments, and Field-Level History

## Scope

This stage is API-only. It updates the MongoDB models and services for richer item metadata, quantity-based repairment records, and complete field-level audit history. Frontend changes are explicitly deferred.

## Data model

### Item

- Rename `category` to `organization`.
- Make `part_num` optional while retaining string trimming.
- Add `serial_num: String`.
- Add `functional: Boolean`, default `false`.
- Add `under_repairment: Boolean`, default `false`.
- Add `type: String`, restricted to `pcb`, `module`, or `else`.
- Add `edit_count: Number`, default `0`.
- Add `quantity: Number`, default `1`, and require a positive integer.
- Preserve existing storage, delivery, image, tag, update, deletion, and timestamp behavior.

### History

- Keep `item_id` as a required `Item` reference.
- Add `repairment_id` as an optional `Repairment` reference, defaulting to `null` for item-only changes.
- Replace top-level `from` and `to` fields with `fields`, an array of `{ field_name, from, to }` entries.
- `from` is nullable; `to` may contain any JSON-compatible field value.
- Keep `date` with a default of `Date.now`.

### Repairment

- Add required `item_id` reference to `Item`.
- Add required status enum: `repaired`, `unrepairable`, `repairing`, or `awaiting_spare_part`.
- Add `field_test_date: [Date]`, defaulting to an empty array.
- Add `repairer: [String]`, defaulting to an empty array.
- Add `spare_part: [{ part: String, price: Number }]`, defaulting to an empty array.
- Use timestamps for repairment creation and modification.

## Service behavior

Item creation and updates compare the persisted item before and after state. Every changed editable field is recorded in one history document as a field entry; item creation records each supplied/defaulted item field with `from: null`. Item edits increment `edit_count` exactly once when at least one item field changes.

When `under_repairment` is true, the item must be stored and its location must be normalized to exactly `{ warehouse: "lab", section: null, pack: null }`. The service creates missing repairment documents until the number of repairments equals the item quantity, without duplicating existing documents. Invalid combinations fail atomically.

Repairment creation and updates are exposed through dedicated service/controller/routes. A repairment edit increments the parent item's `edit_count` exactly once and writes history entries with the parent `item_id` and the edited `repairment_id`. Repairment field names are represented directly (for example `status`, `repairer`, or `spare_part`).

All item, repairment, and history writes participating in one request occur in the existing MongoDB transaction pattern. Failed validation or transaction work must not leave partial repairment, item, edit-count, or history changes.

## API surface

- Preserve existing item routes, updating accepted item fields and response data.
- Add repairment routes for create, list-by-item, get-by-id, and patch/update.
- Keep validation failures in the existing stable error envelope.
- Frontend behavior and controls are out of scope for this stage; the API exposes the `type` enum for a future select dropdown.

## Compatibility and migration

This is a schema/API refactor for the current project. Existing code paths using `category`, old history `from`/`to`, or the old item-only editable-field list must be updated. No data migration script is included unless existing tests or repository conventions require one; tests will cover the new shape.

## Verification

Add or update tests for:

- item defaults, optional `part_num`, organization/type validation, and quantity validation;
- repairment schema enums and structured spare parts;
- history field arrays and nullable `repairment_id`;
- item create/update field-level history and single edit-count increments;
- repairment create/update history with `repairment_id` and parent edit-count increments;
- automatic quantity-based repairment creation and no duplicate synchronization;
- under-repairment storage/lab validation and transaction rollback behavior;
- repairment HTTP routes and stable validation responses.
