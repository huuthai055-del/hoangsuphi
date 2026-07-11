/**
 * Parses a duration string (e.g., "15m", "30d", "2h", "10s") and converts it to seconds.
 * Throws an Error if the duration format is invalid or unsupported.
 */
export function parseDurationToSeconds(duration: string): number {
  if (!duration) {
    throw new Error('Duration string is required');
  }
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const value = Number.parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      throw new Error(`Unsupported duration unit: ${unit}`);
  }
}
