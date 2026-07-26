# ADR-005: Cursor-Based Pagination

## Context

The request listing endpoint needs pagination. Two strategies exist: offset-based (`?page=2&limit=20`) and cursor-based (`?cursor=<opaque>&limit=20`).

## Decision

Use cursor-based pagination with a compound cursor encoding `(createdAt, id)` as a base64url string. The cursor acts as a tie-breaker — when multiple records share the same `createdAt` timestamp, `id` (UUID) ensures deterministic ordering. Response format: `{ data, nextCursor }`.

## Consequences

- **Positive:** Stable results when new records are inserted between pages — no skipped or duplicated rows. Efficient on large datasets — the database uses the `(tenant_id, created_at)` composite index to seek directly to the cursor position instead of scanning and discarding `OFFSET` rows.
- **Negative:** No "jump to page N" capability. No total count. Admin dashboards that show page numbers (1, 2, 3... 10) would need an offset strategy alongside cursor pagination, selectable via query parameter.

## Alternatives Considered

- **Offset pagination:** Simple to implement, supports page numbers, but suffers from row drift (inserts/deletes shift pages) and performance degradation at high offsets (`OFFSET 10000` scans and discards 10,000 rows).
- **Keyset pagination without encoding:** Exposing raw `createdAt` and `id` as separate query parameters works but leaks internal column names and makes the API harder to evolve.
