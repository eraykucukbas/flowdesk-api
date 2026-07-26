# Security Notes

## Privilege escalation prevention — register endpoint

The register endpoint creates the first user of a new tenant. The role is hardcoded to `ADMIN` on the server side and never accepted from the client payload. If the role were part of the request body, any caller could send `{"role": "ADMIN"}` and gain administrative access — a classic privilege escalation vulnerability. Additional users (AGENT role) will be created through a protected admin-only endpoint.

## SQL injection prevention

User input never becomes part of a SQL command because TypeORM uses parameterized queries — values are bound as `$1`, `$2` placeholders, so payloads like `'; DROP TABLE requests; --` are stored as literal strings instead of being executed. On top of that, the ValidationPipe with class-validator rejects malicious input before it even reaches the database: `@IsEnum` blocks invalid status values, `@IsEmail` blocks injection in email fields, and `@Matches` enforces a whitelist of allowed sort columns to prevent ORDER BY injection in dynamic query builder usage. This defense-in-depth approach was verified with 8 E2E tests covering DROP TABLE, UNION SELECT, OR 1=1, enum bypass, and sort injection — all blocked.
