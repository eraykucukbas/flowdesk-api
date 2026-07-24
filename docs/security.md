# Security Notes

## Privilege escalation prevention — register endpoint

The register endpoint creates the first user of a new tenant. The role is hardcoded to `ADMIN` on the server side and never accepted from the client payload. If the role were part of the request body, any caller could send `{"role": "ADMIN"}` and gain administrative access — a classic privilege escalation vulnerability. Additional users (AGENT role) will be created through a protected admin-only endpoint.
