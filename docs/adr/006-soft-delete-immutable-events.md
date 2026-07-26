# ADR-006: Soft Delete + Immutable Event Log with RESTRICT

## Context

Deleting tenant data (tenants, users, requests) must be reversible, and every state change on a request must be auditable. Foreign key behavior on deletion affects data integrity.

## Decision

- **Soft delete** (`@DeleteDateColumn`) on Tenant, User, and Request. A `DELETE` sets `deleted_at` instead of removing the row. Soft-deleted records are excluded from normal queries by TypeORM's default behavior.
- **Immutable event log:** `RequestEvent` records (CREATED, STATUS_CHANGED, LLM_CLASSIFIED) are never updated or deleted. They form an append-only audit trail with `jsonb` payloads.
- **RESTRICT on all foreign keys:** No cascading deletes. Attempting to delete a tenant that still has users or requests fails with a database error. This is intentional — data must be explicitly cleaned up.

## Consequences

- **Positive:** Accidental deletions are recoverable. The event log provides a complete history of every request's lifecycle (who changed what, when, LLM classification results with token costs). RESTRICT prevents orphaned records — you can't delete a tenant and silently lose its requests.
- **Negative:** Soft-deleted rows still occupy unique constraints (`email`, `slug`, `externalMessageId`). A production system would use partial unique indexes (`WHERE deleted_at IS NULL`). The event log grows indefinitely — archival or partitioning would be needed at scale.

## Alternatives Considered

- **Hard delete with CASCADE:** Simpler, but irreversible. A mistaken tenant deletion destroys all associated data. CASCADE silently removes dependent rows — dangerous in a multi-tenant system.
- **Hard delete with soft-delete events only:** Audit trail survives but the original records are gone. Reconstruction requires replaying events, which is fragile.
- **Event sourcing:** The event log *is* the source of truth, and current state is derived from it. Powerful but far beyond v0.1 scope and banned in the project constraints.
