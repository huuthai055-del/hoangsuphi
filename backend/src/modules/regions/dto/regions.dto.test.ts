import { describe, expect, test } from 'bun:test';
import { CreateRegionSchema, ListRegionsQuerySchema } from './regions.dto';

describe('Regions DTO Validation', () => {
  describe('CreateRegionSchema', () => {
    test('should pass with valid data', () => {
      const payload = {
        name: 'Bản Phùng',
        slug: 'ban-phung',
        level: 4,
        parentId: '3a552ef3-40e1-7ca7-8000-000000000001',
        center: { lng: 104.5, lat: 22.5 },
        description: 'Đất lúa chín vàng',
        coverImage: 'https://example.com/cover.jpg',
        gallery: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
      };

      const result = CreateRegionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    test('should fail when required fields are missing', () => {
      const payload = {
        slug: 'ban-phung',
        level: 4,
      };

      const result = CreateRegionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toBe('Name is required');
      }
    });

    test('should fail when level is out of bounds', () => {
      const payload = {
        name: 'Bản Phùng',
        slug: 'ban-phung',
        level: 6,
      };

      const result = CreateRegionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toBe('Level must not exceed 5');
      }
    });

    test('should fail when parentId is an invalid UUID', () => {
      const payload = {
        name: 'Bản Phùng',
        slug: 'ban-phung',
        level: 4,
        parentId: 'invalid-uuid',
      };

      const result = CreateRegionSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toBe('Parent ID must be a valid UUID');
      }
    });

    test('should fail when slug format is invalid', () => {
      const payload = {
        name: 'Bản Phùng',
        slug: 'ban_phung_invalid',
        level: 4,
      };

      const result = CreateRegionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    test('should fail when extra fields are present', () => {
      const payload = {
        name: 'Bản Phùng',
        slug: 'ban-phung',
        level: 4,
        extraField: 'some-value',
      };

      const result = CreateRegionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    test('should fail when gallery items are not valid URLs', () => {
      const payload = {
        name: 'Bản Phùng',
        slug: 'ban-phung',
        level: 4,
        gallery: ['not-a-url'],
      };

      const result = CreateRegionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('ListRegionsQuerySchema', () => {
    test('should default page to 1, limit to 20, sort to name and order to asc', () => {
      const result = ListRegionsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sort).toBe('name');
        expect(result.data.order).toBe('asc');
      }
    });

    test('should fail when page is less than 1', () => {
      const result = ListRegionsQuerySchema.safeParse({ page: '0' });
      expect(result.success).toBe(false);
    });

    test('should fail with invalid sort and order values', () => {
      const result = ListRegionsQuerySchema.safeParse({ sort: 'invalid', order: 'invalid' });
      expect(result.success).toBe(false);
    });
  });
});
