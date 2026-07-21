# Step 5.1 — Implementation Manifest

## Project foundation

- `package.json`, `package-lock.json`
- `tsconfig.json`, `next-env.d.ts`
- `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`
- `.env.example`, `.gitignore`, `README.md`
- `scripts/test-all.ts`

## Design system & layout

- `src/app/globals.css`
- `src/components/brand/`
- `src/components/layout/`
- `src/components/navigation/`
- `src/components/providers/`
- `src/components/ui/`
- `src/components/media/`

## API/auth/contact foundation

- `src/lib/api/`
- `src/lib/auth/`
- `src/lib/contact/`
- `src/app/api/auth/`
- `src/config/env.ts`

## Global UX states

- `src/app/loading.tsx`
- `src/app/error.tsx`
- `src/app/not-found.tsx`

## Foundation routes

- `/co-so`, `/dia-diem`, `/khu-vuc`, `/tien-ich`
- `/tim-kiem`, `/gan-toi`, `/yeu-thich`, `/tai-khoan`
- Existing dynamic SEO routes remain integrated.

## Tests

Unit/contract tests cover navigation, primitives, URL/request API boundaries, auth contracts/session refresh, contact helpers, SEO and middleware. Runtime suites cover cross-crawl, redirect resolver and real `next start` SSR/proxy behavior.

## Required commands

```bash
npm run typecheck
npm run lint
npm run build
npm run test
```

Or:

```bash
npm run verify
```
