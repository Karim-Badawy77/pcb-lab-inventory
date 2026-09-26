# Stage 3: Analysis and statistics

## Purpose and agreed scope

Add an Analysis and statistics page to the existing Vue application, backed by the Express API. "Audited" means registered records, not a separate inspection workflow. Include all originally requested statistics plus unrepairable counts, repaired units awaiting delivery, monthly delivery trends, clickable counts, backlog age, spare-part costs, and CSV export.

Repairer contributions are explicitly based on repairments registered during the selected period, using `createdAt`. Each distinct listed repairer receives one contribution per matching repairment, including unfinished work. The metric represents attribution on those registered records, not the date a person performed work.

## Counting rules

- Exclude soft-deleted items and repairments. Exclude repairments whose parent item is deleted or missing.
- Total registered items counts item documents. Total physical units sums their `quantity`, with a fallback of one for legacy records missing quantity.
- Total registered repairments counts repairment documents. One repairment represents one unit; do not multiply repairment counts by parent quantity.
- Overview counts describe current records and do not change with the activity date filter.
- Show item record counts and physical unit totals for item classifications. Show repairment counts separately for status breakdowns.
- Location, functional state, and repair state are overlapping dimensions. Display explanatory labels; do not present them as slices of one additive total.
- Stored in container: `stored: true` and warehouse equal to `container`, matching case-insensitively after trimming. Stored in lab uses the same rule for `lab`. Other warehouse names remain valid and appear in an Other locations count.
- Items under repairment: the item's `under_repairment` flag is true.
- Items repaired, awaiting spare parts, or unrepairable: distinct parent items with at least one active repairment in the corresponding current status. A parent with mixed unit statuses can appear in multiple counts; physical unit subtotals are omitted for these mixed-status parent counts to avoid implying that every unit shares that status.
- Repairment status counts cover `repairing`, `awaiting_spare_part`, `repaired`, `unrepairable`, and `delivered`.
- Repaired awaiting delivery means repairments with current status `repaired`. This is a repairment/unit count.
- Functional items use the item-level `functional` flag; do not infer functionality from repairment status.
- Delivered items use `stored: false`; delivered repairments use status `delivered`. Keep these totals separate and never add them together.
- Trim repairer names and deduplicate case-insensitively within each record. Use a consistent display spelling and merge matching names across records. A record with multiple repairers credits each person once, so contributions can exceed the repairment count.

## Page layout and interaction

Add `/statistics` and a navigation link using the existing app styling and responsive patterns.

1. Overview cards: registered items, physical units, registered repairments, and functional items.
2. Current inventory: location and item classifications, plus a complete repairment status breakdown. Clearly identify record versus unit counts.
3. Period activity: date controls, delivered item records and units, delivered repairments, a monthly delivery chart with separate item and repairment series, repairer contributions, and spare-part costs.
4. Follow-up: repaired awaiting delivery and backlog age groups.

Date presets: All time (default), This month, Last month, This year, and Custom range. Persist period selection in URL query parameters so navigation and refresh preserve it. Use the browser's IANA timezone, displayed beside the filter; fall back to UTC only when unavailable. Dates are inclusive calendar dates, converted to a half-open UTC interval from start-of-first-day to start-of-day-after-last-day using that timezone, including daylight saving changes. Validate dates, timezone, and range order in the API.

Loading, retryable error, zero-data, and empty-filter states follow existing feedback components. Charts include a readable table/text equivalent. Use local runtime assets only; no CDN chart dependencies.

## Period calculations

- Delivered items and repairments filter by effective delivery date and current delivered state. Count each matching record once, using its latest delivery episode; this is not a count of repeated delivery events.
- The monthly chart uses those same records and dates, grouped by calendar month in the selected timezone. With All time, span the earliest known delivery month through the current month, including zero months. Include later months if future-dated records exist.
- Repairer contributions filter repairments by registration date (`createdAt`), then group their current repairer lists. Explain this basis beside the table.
- Spare-part costs sum recorded `spare_part.price` values on repairments registered during the period, including unfinished work. These are recorded part costs, not spending transactions or labor costs. Show no currency symbol because the current model has no currency field. Do not invent part quantities or multiply costs by item quantity.
- Backlog is a current-state view independent of the selected period. Include `repairing` and `awaiting_spare_part` repairments. Age is elapsed time since registration, using complete 24-hour days, grouped into 0–7, 8–30, 31–90, and over 90 days. Show separate status counts within each group. Future registration dates have age zero.

## Delivery date integrity and legacy data

Add an optional item `delivered_at` field and support it in item create/edit delivery forms. A new delivered item or a stored-to-delivered transition defaults to the current timestamp when no date is provided. Preserve the existing delivery timestamp on unrelated edits. Clear the current delivery date when an item returns to storage; history retains the prior episode.

Apply the same timestamp preservation to repairment edits: editing an already delivered repairment must not reset its date. Returning to another status clears its current delivery timestamp and a subsequent delivery sets a new date. Validate supplied timestamps and keep history changes within the existing database transactions.

When delivering the last active repairment automatically delivers its parent item, set the parent's delivery date to the date of the transition-causing delivery and record the parent inventory changes in item history. Preserve location removal and existing inventory-state invariants. Avoid incrementing parent edit counts twice for one repairment operation.

For older delivered records without `delivered_at`, the reporting service may infer a date from the latest explicit history transition into the delivered state (`stored` true to false for an item, status into `delivered` for a repairment). An item creation history with `stored` null to false is a known registration-as-delivered date. Do not use generic modification timestamps or infer a parent delivery date solely from child dates. If a date cannot be reliably recovered, include the record in all-time delivered totals and show it separately as Delivery date unknown; exclude it from bounded date filters and monthly chart buckets. Historical inference is read-only, requiring no bulk migration.

## API and matching records

Add a statistics service, controller, and routes under `/api/statistics`:

- `GET /api/statistics`: returns overview, classifications, repairment statuses, period deliveries, monthly series, repairers, recorded spare-part costs, backlog groups, and unknown-date totals, plus the resolved filter metadata.
- `GET /api/statistics/records`: takes an allowlisted metric, optional repairer or backlog group, the period controls where relevant, and validated pagination. Returns matching item or repairment records and a total count.
- `GET /api/statistics/export`: returns a CSV summary of the same report, including scope, date basis, timezone, item records versus units, monthly buckets, repairers, backlog, costs, and unknown-date disclosures.

Use database aggregation and shared predicates/date resolution for totals, chart buckets, exports, and matching lists. Avoid downloading all inventory and repairments into the frontend to compute statistics. Add targeted indexes where the queries need them.

Clickable cards, status counts, backlog groups, and repairer contribution counts open a filtered results view at `/statistics/records`. Preserve metric and applicable date filters in its URL. Item results show quantity and link to item details. Repairment results show serial number, parent name, current status, registration date, and repairers, linking to repairment details. Pagination must work across the entire result set. Physical-unit count links open matching item records and label both matched records and their summed units.

Costs are summaries, not record counts, but provide a View contributing repairments link. Numeric totals and records agree when read against unchanged data; state changes between requests can legitimately alter results.

Generate CSV with proper quoting, UTF-8 support, and spreadsheet formula protection for user-entered text. Export all report sections rather than only the visible page of records. Use a dated filename and expose loading/error feedback for export failures.

## Architecture and validation

Reuse existing models, transaction patterns, response envelopes, frontend API helpers, and feedback components. Keep report aggregation and filtered-record predicates in focused backend modules, and date controls, cards, chart, contribution table, and record list in focused frontend components. No unrelated refactoring or new authentication system.

Meaningful verification covers quantity versus document counts, overlapping classifications, multiple repairers and name deduplication, parent deletion, date boundaries and timezone changes, registration-based contributions, mixed repairment statuses, missing historical dates, preserved delivery timestamps, automatic parent delivery history, backlog boundaries, cost sums, pagination, and CSV correctness. Frontend verification covers routing, filter persistence, loading/errors, chart accessibility, matching-record navigation, and exports. Run API tests, frontend tests, and the production build before declaring implementation complete.

## Implementation scope

This specification defines the agreed design. Implementation follows a reviewed plan after specification review. It does not add an explicit audit process, attempt to measure hours worked, or treat recorded part prices as dated financial transactions.
