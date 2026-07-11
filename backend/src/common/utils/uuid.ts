/**
 * Generates a type-safe UUIDv7.
 * UUIDv7 is time-ordered, which reduces database index fragmentation compared to UUIDv4.
 */
export function generateUuidV7(): string {
  const timestamp = Date.now();
  const hexTimestamp = timestamp.toString(16).padStart(12, '0');
  const randomBytes = crypto.getRandomValues(new Uint8Array(10));

  const r0 = randomBytes[0];
  const r2 = randomBytes[2];
  if (r0 !== undefined && r2 !== undefined) {
    // Set version 7 (0111) -> 4 bits at byte 6
    randomBytes[0] = (r0 & 0x0f) | 0x70;
    // Set variant 1 (10) -> 2 bits at byte 8
    randomBytes[2] = (r2 & 0x3f) | 0x80;
  }

  const hexRandom = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return [
    hexTimestamp.slice(0, 8),
    hexTimestamp.slice(8, 12),
    hexRandom.slice(0, 4),
    hexRandom.slice(4, 8),
    hexRandom.slice(8),
  ].join('-');
}

/**
 * Validates if a string is a valid UUID format (v4, v5, or v7).
 */
export function isValidUuid(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}
