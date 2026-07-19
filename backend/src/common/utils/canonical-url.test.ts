import { expect, test, describe } from 'bun:test';
import { buildCanonicalEntityUrl } from './canonical-url';

describe('Canonical URL Utility', () => {
  test('maps ARTICLE', () => {
    expect(buildCanonicalEntityUrl('ARTICLE', 'bai-viet-1')).toBe('/cam-nang/bai-viet-1');
    expect(buildCanonicalEntityUrl('article', 'bai-viet-2')).toBe('/cam-nang/bai-viet-2');
  });

  test('maps PLACE', () => {
    expect(buildCanonicalEntityUrl('PLACE', 'dia-diem-1')).toBe('/dia-diem/dia-diem-1');
    expect(buildCanonicalEntityUrl('TOURIST_PLACE', 'dia-diem-2')).toBe('/dia-diem/dia-diem-2');
  });

  test('maps BUSINESS', () => {
    expect(buildCanonicalEntityUrl('BUSINESS', 'co-so-1')).toBe('/co-so/co-so-1');
  });

  test('maps ATTRACTION', () => {
    expect(buildCanonicalEntityUrl('ATTRACTION', 'tien-ich-1')).toBe('/tien-ich/tien-ich-1');
  });

  test('throws on unknown type', () => {
    expect(() => buildCanonicalEntityUrl('UNKNOWN', 'slug')).toThrow();
  });

  test('throws on empty slug', () => {
    expect(() => buildCanonicalEntityUrl('ARTICLE', '')).toThrow();
  });
});
