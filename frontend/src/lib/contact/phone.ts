function digitsOnly(value: string): string {
  return value.replace(/[\s().-]/g, "");
}

/**
 * Builds a safe tel: link for Vietnamese local numbers or E.164 numbers.
 * Returns null instead of guessing malformed contact data.
 */
export function normalizePhoneHref(input: string | null | undefined): string | null {
  if (!input) return null;
  const normalized = digitsOnly(input.trim());

  if (/^\+[1-9]\d{7,14}$/.test(normalized)) {
    return `tel:${normalized}`;
  }

  if (/^0\d{8,10}$/.test(normalized)) {
    return `tel:${normalized}`;
  }

  return null;
}
