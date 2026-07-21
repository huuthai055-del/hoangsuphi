# Step 5.1.4 — Typed API Client Foundation

## Status

`IMPLEMENTED WITH SCHEMA-BOUND GENERIC CONTRACT`

The uploaded archive did not contain backend DTO schema files. The client therefore requires callers to supply the real runtime schema and does not invent catalog DTOs.

## Architecture

- `serverApiRequest`: server-only access to `INTERNAL_BACKEND_URL`.
- `browserApiRequest`: browser-only, same-origin `/api/*` BFF access.
- `requestJson`: shared fetch, timeout, JSON parsing, runtime schema validation and RFC 7807 mapping.
- `public-catalog`: verified path builders for the three approved public endpoints.

## Approved endpoints covered

- `GET /api/v1/public/catalog/:kind`
- `GET /api/v1/public/catalog/:kind/:slug`
- `GET /api/v1/public/references/:kind`

Catalog and reference `kind` values are validated as safe path segments. Exact enums and DTO schemas must be imported from or mirrored against the real backend contract in the full repository.

## Error model

`FrontendApiError` separates:

- validation
- unauthorized
- forbidden
- not found
- conflict
- rate limited
- timeout
- network
- invalid response
- server/unknown

Raw backend stack traces are never used as user-facing messages.

## Cursor contract

- Cursor is represented as `OpaqueCursor`.
- It remains an opaque string.
- The client does not decode or convert cursor pagination into offsets.
- Query serialization preserves special cursor characters.

## Cache and security

- Foundation requests default to `cache: no-store`.
- Browser client refuses to run during server rendering.
- Browser calls only same-origin BFF paths.
- Server-only modules import `server-only`.
- Request bodies are serialized only when explicitly supplied.
- API paths reject absolute/external path injection.

## Runtime schema strategy

The `RuntimeSchema<T>` interface is compatible with Zod `safeParse`. Feature modules should pass their strict Zod schemas at the API boundary.
