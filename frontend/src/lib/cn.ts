export type ClassNameValue = string | false | null | undefined;

/**
 * Joins conditional class names without adding a runtime dependency.
 */
export function cn(...values: readonly ClassNameValue[]): string {
  return values.filter(Boolean).join(" ");
}
