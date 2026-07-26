# ADR-001: PostgreSQL as the Primary Database

## Context

FlowDesk API needs a relational database that supports multi-tenant data isolation, ACID transactions, and JSON storage for flexible event payloads. The database must be available as a managed service on Railway (our deployment target) and have strong TypeORM support.

## Decision

Use PostgreSQL 16 as the sole database engine.

## Consequences

- **Positive:** ACID transactions protect multi-step operations (e.g., atomic tenant + user creation). `jsonb` columns store LLM classification payloads without schema rigidity. Composite indexes on `(tenant_id, created_at)` enable efficient tenant-scoped queries. `uuid-ossp` and `pgcrypto` extensions provide cryptographic primitives natively.
- **Negative:** No built-in full-text search comparable to Elasticsearch — acceptable since search is out of scope for v0.1.

## Alternatives Considered

- **MongoDB:** Flexible schema but weak transaction support across collections. Multi-tenant isolation harder to enforce at the query level without an ORM-like abstraction.
- **MySQL:** Viable, but PostgreSQL's `jsonb`, partial indexes, and extension ecosystem are stronger fits for this use case.
