# Performance Notes

## Index Analysis — requests table (5,000 rows, 2 tenants)

### Why composite indexes?

Every query in a multi-tenant system starts with `WHERE tenant_id = X`. Without an index, Postgres scans all 5,000 rows and discards half of them — wasted I/O that grows linearly with data.

A single `tenant_id` index would help with filtering, but the database would still need a separate sort step (for `ORDER BY created_at`) or a second filter pass (for `AND status = 'OPEN'`). Composite indexes solve both in one lookup: `(tenant_id, created_at)` keeps rows pre-sorted within each tenant, and `(tenant_id, status)` pre-groups rows by status within each tenant.

The trade-off: every INSERT and UPDATE must also update the index, so write performance decreases slightly and disk usage grows. We only index columns that appear in frequent query patterns — not everything.

### Query 1: Tenant requests ordered by date

```sql
SELECT * FROM requests
WHERE tenant_id = '41eaeb32-...'
ORDER BY created_at DESC
LIMIT 20;
```

**Before index (Seq Scan):**

```
Seq Scan on requests  (actual time=0.003..0.383 rows=2500)
  Filter: (tenant_id = '41eaeb32-...')
  Rows Removed by Filter: 2500
Sort  (actual time=0.568..0.569 rows=20)
  Sort Method: top-N heapsort  Memory: 30kB
Execution Time: 0.611 ms
```

Postgres scanned all 5,000 rows, discarded 2,500, then sorted the remaining 2,500 to find the top 20.

**After index — `(tenant_id, created_at)`:**

```
Index Scan Backward using IDX_483d... on requests  (actual time=0.028..0.030 rows=20)
  Index Cond: (tenant_id = '41eaeb32-...')
Execution Time: 0.074 ms
```

Postgres walked the index backward (already sorted by `created_at`), grabbed 20 rows, and stopped. No full table scan, no sort step. **~8x faster** — and the gap widens with more data.

### Query 2: Open requests for a tenant

```sql
SELECT * FROM requests
WHERE tenant_id = '41eaeb32-...'
  AND status = 'OPEN';
```

**Before index (Seq Scan):**

```
Seq Scan on requests  (actual time=0.004..0.352 rows=587)
  Filter: (tenant_id = '41eaeb32-...' AND status = 'OPEN')
  Rows Removed by Filter: 4413
Execution Time: 0.406 ms
```

Full table scan — 5,000 rows read, 4,413 discarded.

**After index — `(tenant_id, status)`:**

```
Bitmap Index Scan on IDX_d282a5...  (actual time=0.043..0.043 rows=587)
  Index Cond: (tenant_id = '41eaeb32-...' AND status = 'OPEN')
Execution Time: 0.250 ms
```

Index directly located the 587 matching rows without scanning unrelated data. **~1.6x faster** at 5K rows.

### request_events index

`request_events (request_id)` — when loading a request's event history, this index prevents a full scan of the events table. Without it, fetching events for one request would scan every event across all requests.
