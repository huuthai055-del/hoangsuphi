# Step 5.1.3 — Component Primitives & UX States

## Status

`IMPLEMENTED IN PROVIDED FRONTEND SOURCE ARCHIVE`

Project-level acceptance still requires the real frontend package, lint and build configuration.

## Implemented primitives

### Actions

- `Button` with primary, secondary, ghost and danger variants.
- `LinkButton` for crawlable internal navigation.
- `IconButton` with accessible label and non-leaking loading state.
- `ContactLink` restricted to safe `tel:` and `https:` links.

### Forms

- `Label`, `Field`, `FieldDescription`, `FieldError`.
- `Input` and `Textarea` with disabled and invalid semantics.

### Content

- `Card`, `CardHeader`, `CardContent`, `CardFooter`.
- `Badge`, `Chip`, `Divider`, `SectionHeading`.

### Feedback and UX states

- `Skeleton`, `LoadingState`.
- `Alert`, `InlineError`, `ErrorState`.
- `EmptyState`.

### Media

- `PublicImage` using `next/image` with explicit dimensions and responsive `sizes`.
- `MediaFallback` for failed or missing public media.
- Decorative image fallback remains hidden from assistive technology.

## Global UX integration

- Added `src/app/loading.tsx` using the shared loading state.
- Replaced hardcoded 500 page UI with `ErrorState` and `Button`.
- Replaced hardcoded 404 page UI with `EmptyState` and `LinkButton`.
- Removed hardcoded blue/gray utility colors from these global states.

## Accessibility contract

- Native buttons and links are used instead of clickable `div` elements.
- Minimum interactive heights are 40–48px depending on size.
- Focus styling uses the Step 5.1.1 semantic ring token.
- Loading states use `aria-busy`/`role=status` and hidden text.
- Error states use `role=alert` where immediate announcement is appropriate.
- `Chip` exposes selection through `aria-pressed`.

## Deferred feature components

The following remain outside foundation scope: catalog cards, detail galleries, review widgets, favorite logic, Nearby result rows and full forms.
