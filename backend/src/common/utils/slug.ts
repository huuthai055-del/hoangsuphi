/**
 * Generates a clean, URL-friendly slug from a text string.
 * It decomposes accented characters (supporting Vietnamese), replaces spaces/underscores with dashes,
 * and removes any non-alphanumeric characters.
 *
 * @param text The input string (e.g. "Ruộng bậc thang Bản Phùng")
 * @returns A normalized slug (e.g. "ruong-bac-thang-ban-phung")
 */
export function slugify(text: string): string {
  return (
    text
      .toString()
      .normalize('NFD') // Split accented characters into base characters and marks
      // biome-ignore lint/suspicious/noMisleadingCharacterClass: removing decomposed diacritical marks range
      .replace(/[\u0300-\u036f]/g, '') // Remove all decomposed diacritical marks
      .toLowerCase()
      .replace(/đ/g, 'd') // Convert Vietnamese letter 'đ' to 'd'
      .replace(/[^a-z0-9\s-]/g, '') // Strip away any remaining non-alphanumeric chars
      .trim()
      .replace(/[\s_]+/g, '-') // Convert spaces and underscores to single dashes
      .replace(/-+/g, '-') // Collapse consecutive dashes
      .replace(/^-+|-+$/g, '')
  ); // Strip leading and trailing dashes
}
