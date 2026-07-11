import { expect, test, describe } from 'bun:test';
import {
  CreatePlaceSchema,
  UpdatePlaceSchema,
  ListPlacesQuerySchema,
  PlaceNearbyQuerySchema,
  PlaceIdParamsSchema,
  PlaceSlugParamsSchema,
} from './places.dto';

describe('Tourist Places DTO Validation', () => {
  describe('CreatePlaceSchema', () => {
    test('should pass with valid data and normalize slug', () => {
      const payload = {
        regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
        name: 'Bản Phùng Rice Terrace',
        slug: ' BẢN-phùng-Terrace! ',
        location: { lng: 104.5, lat: 22.5 },
        description: 'Golden fields',
        coverUrl: 'https://example.com/cover.jpg',
      };

      const result = CreatePlaceSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slug).toBe('ban-phung-terrace');
      }
    });

    test('should fail when required fields are missing', () => {
      const payload = {
        name: 'Bản Phùng',
      };

      const result = CreatePlaceSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    test('should fail when regionId is not a valid UUID', () => {
      const payload = {
        regionId: 'invalid-uuid',
        name: 'Bản Phùng',
        location: { lng: 104.5, lat: 22.5 },
      };

      const result = CreatePlaceSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toBe('Region ID must be a valid UUID');
      }
    });

    test('should fail when coordinates are out of bounds', () => {
      const payload = {
        regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
        name: 'Bản Phùng',
        location: { lng: 200, lat: 22.5 },
      };

      const result = CreatePlaceSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toBe('Longitude must be between -180 and 180');
      }
    });

    test('should fail when coverUrl is an invalid URL', () => {
      const payload = {
        regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
        name: 'Bản Phùng',
        location: { lng: 104.5, lat: 22.5 },
        coverUrl: 'not-a-url',
      };

      const result = CreatePlaceSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    test('should fail when extra fields are present', () => {
      const payload = {
        regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
        name: 'Bản Phùng',
        location: { lng: 104.5, lat: 22.5 },
        extraField: 'some-value',
      };

      const result = CreatePlaceSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('ListPlacesQuerySchema', () => {
    test('should transform query strings and default page to 1 and limit to 20', () => {
      const result = ListPlacesQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    test('should parse custom page and limit values', () => {
      const result = ListPlacesQuerySchema.safeParse({ page: '5', limit: '50' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(result.data.limit).toBe(50);
      }
    });

    test('should fail when page is less than 1', () => {
      const result = ListPlacesQuerySchema.safeParse({ page: '0' });
      expect(result.success).toBe(false);
    });
  });

  describe('PlaceNearbyQuerySchema', () => {
    test('should parse and transform nearby search query', () => {
      const result = PlaceNearbyQuerySchema.safeParse({
        lng: '104.5',
        lat: '22.5',
        radius: '1000',
        limit: '15',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lng).toBe(104.5);
        expect(result.data.lat).toBe(22.5);
        expect(result.data.radius).toBe(1000);
        expect(result.data.limit).toBe(15);
      }
    });

    test('should fallback to default radius of 5000 and limit of 20', () => {
      const result = PlaceNearbyQuerySchema.safeParse({
        lng: '104.5',
        lat: '22.5',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.radius).toBe(5000);
        expect(result.data.limit).toBe(20);
      }
    });

    test('should fail with invalid coordinates or radius values', () => {
      const result = PlaceNearbyQuerySchema.safeParse({
        lng: 'invalid',
        lat: '22.5',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Params Validation', () => {
    test('should validate ID param correctly', () => {
      const valid = PlaceIdParamsSchema.safeParse({ id: '3a552ef3-40e1-7ca7-8000-000000000001' });
      expect(valid.success).toBe(true);

      const invalid = PlaceIdParamsSchema.safeParse({ id: 'invalid-uuid' });
      expect(invalid.success).toBe(false);
    });

    test('should validate Slug param correctly', () => {
      const valid = PlaceSlugParamsSchema.safeParse({ slug: 'ban-phung' });
      expect(valid.success).toBe(true);

      const invalid = PlaceSlugParamsSchema.safeParse({ slug: 'ban_phung' });
      expect(invalid.success).toBe(false);
    });
  });
});
