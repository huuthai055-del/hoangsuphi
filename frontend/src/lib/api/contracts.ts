export type ProblemDetails = Readonly<{
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  errors?: unknown;
}>;

export type ApiEnvelope<T> = Readonly<{
  data: T;
  meta?: unknown;
}>;

declare const opaqueCursorBrand: unique symbol;
export type OpaqueCursor = string & { readonly [opaqueCursorBrand]: true };

export type CursorPagination = Readonly<{
  nextCursor: OpaqueCursor | null;
  hasNextPage: boolean;
}>;

export type CursorPage<T> = Readonly<{
  data: readonly T[];
  pagination: CursorPagination;
  meta?: unknown;
}>;

export function asOpaqueCursor(value: string): OpaqueCursor {
  const normalized = value.trim();
  if (!normalized || normalized.length > 2048) {
    throw new Error("Cursor must be a non-empty opaque string of at most 2048 characters");
  }
  return normalized as OpaqueCursor;
}

export function parseProblemDetails(input: unknown, fallbackStatus: number): ProblemDetails {
  if (typeof input !== "object" || input === null) {
    return {
      title: "Request failed",
      status: fallbackStatus,
    };
  }

  const value = input as Record<string, unknown>;
  const status =
    typeof value.status === "number" && Number.isInteger(value.status)
      ? value.status
      : fallbackStatus;

  return {
    type: typeof value.type === "string" ? value.type : undefined,
    title:
      typeof value.title === "string" && value.title.trim()
        ? value.title
        : "Request failed",
    status,
    detail: typeof value.detail === "string" ? value.detail : undefined,
    instance: typeof value.instance === "string" ? value.instance : undefined,
    code: typeof value.code === "string" ? value.code : undefined,
    errors: value.errors,
  };
}
