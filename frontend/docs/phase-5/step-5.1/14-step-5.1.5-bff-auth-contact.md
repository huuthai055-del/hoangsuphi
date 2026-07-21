# Step 5.1.5 — BFF/Auth & Contact Utilities Foundation

## Status

`IMPLEMENTED — BACKEND PATH VERIFICATION REQUIRED IN FULL REPOSITORY`

## BFF routes

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/session`

These routes call configurable backend paths through `INTERNAL_BACKEND_URL`.

## Cookie strategy

- Access and refresh tokens are stored in `HttpOnly` cookies.
- Cookies use `Secure` in production.
- `SameSite=Lax` and `Path=/` are applied.
- Tokens are stripped from browser JSON responses.
- Browser JavaScript never reads token values.
- Logout clears local cookies even if backend revocation is temporarily unavailable.

## Refresh behavior

`withSessionRefresh()` performs at most one retry after a single-flight browser refresh request. It does not loop indefinitely and does not expose tokens.

## CSRF foundation

Unsafe auth requests reject explicit cross-site browser requests using `Origin` and `Sec-Fetch-Site`, while `SameSite` cookies remain the primary browser protection.

## Configurable environment fields

- `AUTH_LOGIN_PATH`
- `AUTH_REFRESH_PATH`
- `AUTH_LOGOUT_PATH`
- `AUTH_REFRESH_TOKEN_FIELD`
- access/refresh cookie names and TTLs
- shared API timeout

Defaults are common REST conventions, but the full repository must verify them against actual backend route registration and token response fields.

## Contact utilities

- `normalizePhoneHref()` returns safe `tel:` links or `null`.
- `getSafeZaloUrl()` accepts phone identifiers or trusted HTTPS Zalo hosts only.
- `hasValidCoordinates()` validates latitude/longitude ranges.
- `buildGoogleMapsDirectionsUrl()` creates a Google Maps deep link without API key.
- `SAFE_EXTERNAL_LINK_PROPS` supplies `noopener noreferrer` and a safe referrer policy.

No map SDK, Leaflet, Mapbox or tile provider was added.
