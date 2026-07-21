# Typed API Client Blueprint

## Ranh giới client

```text
src/lib/api/
  public-client.ts       # Chỉ endpoint public-safe đã xác minh
  bff-client.ts          # Route Handler allowlist cho dữ liệu cá nhân
  envelope.ts            # Success + RFC 7807 mapping
  pagination.ts          # Opaque cursor và offset là hai kiểu riêng
  problem-details.ts
```

Tạo public catalog client riêng cho `/api/v1/public/catalog/*` và reference client cho `/api/v1/public/references/*`. Không tạo `businesses.ts`, `places.ts` hoặc `articles.ts` public client cho legacy CRUD.

```ts
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface OffsetPage<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: unknown;
}
```

- Public client: explicit `no-store` khi contract yêu cầu; map lỗi về UI-safe `FrontendApiError`.
- BFF client: browser chỉ gọi các Next.js route allowlist, không mang bearer/refresh token và không tự refresh token.
- Retry mutation chỉ khi endpoint được thiết kế idempotent; không retry mù quáng POST/PUT/DELETE.
- URL ảnh hỏng dùng placeholder đã được duyệt, không thay đổi dữ liệu nguồn.
