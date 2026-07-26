# ADR-002: Shared-Schema Multi-Tenancy

## Context

FlowDesk serves multiple tenants (companies) from a single deployment. Each tenant's data must be isolated — a user in Tenant A must never see Tenant B's requests. Three common strategies exist: separate databases, separate schemas, or shared schema with a discriminator column.

## Decision

Use shared-schema multi-tenancy with a `tenant_id` column on every tenant-scoped table. All tenants share the same tables. Isolation is enforced at three layers:

1. **JWT input:** `tenantId` comes from the JWT payload, never from request body or query parameters.
2. **Repository:** Every query method requires `tenantId` as a parameter — queries are scoped by design.
3. **Response:** `TenantScopeInterceptor` strips `tenantId` from API responses.

## Consequences

- **Positive:** Single database, single connection pool, simple migrations. Composite indexes `(tenant_id, column)` keep queries fast. No cross-database joins needed.
- **Negative:** A missing `WHERE tenant_id = ?` clause leaks data across tenants. Mitigated by making `tenantId` a required parameter in every repository method and verified with E2E isolation tests (Tenant B gets 404, not 403, for Tenant A's resources).

## Alternatives Considered

- **Database-per-tenant:** Strongest isolation but operationally expensive — connection pooling, migrations, and backups multiply by tenant count. Overkill for this scale.
- **Schema-per-tenant:** Middle ground, but TypeORM's schema switching is complex and migration tooling assumes a single schema.
