export type SafeParseSuccess<T> = Readonly<{ success: true; data: T }>;
export type SafeParseFailure = Readonly<{ success: false; error: unknown }>;
export type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseFailure;

/**
 * Minimal runtime-schema contract implemented by Zod schemas.
 * Keeping the core client bound to this interface makes it testable without
 * forcing every consumer to import Zod in the same module.
 */
export interface RuntimeSchema<T> {
  safeParse(input: unknown): SafeParseResult<T>;
}

export const unknownSchema: RuntimeSchema<unknown> = {
  safeParse(input) {
    return { success: true, data: input };
  },
};

export function formatSchemaError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "Response validation failed";
}
