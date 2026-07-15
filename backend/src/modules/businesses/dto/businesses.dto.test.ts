import { describe, expect, test } from 'bun:test';
import { CreateBusinessSchema, UpdateBusinessSchema } from './businesses.dto';

describe('Business DTO Validation', () => {
  const validUUID = '3a552ef3-40e1-7ca7-8000-000000000001';

  const validPayload = {
    regionId: validUUID,
    businessTypeId: validUUID,
    name: 'Nam Hong Homestay',
    location: { lng: 104.5, lat: 22.5 },
    coverUrl: 'https://example.com/image.jpg',
    amenityIds: [validUUID],
  };

  test('should validate a correct create business payload', () => {
    const result = CreateBusinessSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBeUndefined();
    }
  });

  test('should transform and validate slug if provided', () => {
    const payload = {
      ...validPayload,
      slug: ' Nam Hong-Homestay ',
    };
    const result = CreateBusinessSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe('nam-hong-homestay');
    }
  });

  test('should fail if regionId is not a valid UUID', () => {
    const payload = {
      ...validPayload,
      regionId: 'invalid-uuid',
    };
    const result = CreateBusinessSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  test('should fail if latitude is out of bounds', () => {
    const payload = {
      ...validPayload,
      location: { lng: 104.5, lat: 95.0 },
    };
    const result = CreateBusinessSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  test('validates, canonicalizes and clears a complete VND price range', () => {
    const created = CreateBusinessSchema.safeParse({
      ...validPayload,
      priceMin: '100000.00',
      priceMax: '250000.50',
    });
    expect(created.success).toBe(true);
    if (created.success) {
      expect(created.data.priceMin).toBe('100000');
      expect(created.data.priceMax).toBe('250000.5');
    }
    expect(UpdateBusinessSchema.safeParse({ priceMin: null, priceMax: null }).success).toBe(true);
  });

  test('rejects incomplete, reversed or out-of-range prices', () => {
    expect(CreateBusinessSchema.safeParse({ ...validPayload, priceMin: '100000' }).success).toBe(
      false
    );
    expect(
      CreateBusinessSchema.safeParse({ ...validPayload, priceMin: '250000', priceMax: '100000' })
        .success
    ).toBe(false);
    expect(
      CreateBusinessSchema.safeParse({
        ...validPayload,
        priceMin: '10000000000.00',
        priceMax: '10000000000.00',
      }).success
    ).toBe(false);
  });
});
