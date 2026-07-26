# ADR-003: JWT Access + Refresh Token Strategy

## Context

The API needs stateless authentication for multi-tenant access. Tokens must carry `tenantId` and `role` to avoid a database lookup on every request. Refresh tokens enable long-lived sessions without exposing long-lived access tokens.

## Decision

- **Access token:** 15-minute expiry, signed with `JWT_SECRET`. Payload: `{ sub, tenantId, role }`.
- **Refresh token:** 7-day expiry, signed with `JWT_REFRESH_SECRET` (separate key). Stored as an argon2 hash in a single `refresh_token_hash` column on the `users` table. Rotated on every refresh — the old token is invalidated.

## Consequences

- **Positive:** Stateless access token verification (no DB hit). Token rotation limits the window of a stolen refresh token. Logout is immediate — setting `refresh_token_hash = null` invalidates the session.
- **Negative:** Single-column storage means one active session per user. A login on device B invalidates device A's refresh token. This is a known limitation documented in the README.

## Alternatives Considered

- **Separate `refresh_tokens` table:** One row per session, enabling multi-device support and per-device revocation. Correct for production but adds complexity beyond v0.1 scope.
- **Opaque tokens + Redis:** Server-side session store. Eliminates JWT size concerns but requires Redis infrastructure and loses the stateless benefit.
- **Access token only (long-lived):** Simpler but a stolen token grants access for its entire lifetime. No revocation mechanism without a blacklist.
