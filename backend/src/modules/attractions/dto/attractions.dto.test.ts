import { expect, test, describe } from 'bun:test';
import {
  CreateAttractionSchema,
  UpdateAttractionSchema,
  ListAttractionsQuerySchema,
  AttractionNearbyQuerySchema,
  AttractionIdParamsSchema,
  AttractionSlugParamsSchema,
} from './attractions.dto';

describe('CreateAttractionSchema', () => {
  test('should validate a valid create payload', () => {
    const result = CreateAttractionSchema.safeParse({
      regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
      categoryId: '3a552ef3-40e1-7ca7-8000-000000000002',
      name: 'Chiêu Lầu Thi',
      location: { lng: 104.5, lat: 22.6 },
      description: 'Mountain peak',
    });
    expect(result.success).toBe(true);
  });

  test('should fail if regionId is missing', () => {
    const result = CreateAttractionSchema.safeParse({
      categoryId: '3a552ef3-40e1-7ca7-8000-000000000002',
      name: 'Chiêu Lầu Thi',
      location: { lng: 104.5, lat: 22.6 },
    });
    expect(result.success).toBe(false);
  });

  test('should fail if categoryId is missing', () => {
    const result = CreateAttractionSchema.safeParse({
      regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
      name: 'Chiêu Lầu Thi',
      location: { lng: 104.5, lat: 22.6 },
    });
    expect(result.success).toBe(false);
  });

  test('should fail if name is empty', () => {
    const result = CreateAttractionSchema.safeParse({
      regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
      categoryId: '3a552ef3-40e1-7ca7-8000-000000000002',
      name: '',
      location: { lng: 104.5, lat: 22.6 },
    });
    expect(result.success).toBe(false);
  });

  test('should fail if location is missing', () => {
    const result = CreateAttractionSchema.safeParse({
      regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
      categoryId: '3a552ef3-40e1-7ca7-8000-000000000002',
      name: 'Chiêu Lầu Thi',
    });
    expect(result.success).toBe(false);
  });

  test('should fail if longitude is out of range', () => {
    const result = CreateAttractionSchema.safeParse({
      regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
      categoryId: '3a552ef3-40e1-7ca7-8000-000000000002',
      name: 'Chiêu Lầu Thi',
      location: { lng: 200, lat: 22.6 },
    });
    expect(result.success).toBe(false);
  });

  test('should fail if latitude is out of range', () => {
    const result = CreateAttractionSchema.safeParse({
      regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
      categoryId: '3a552ef3-40e1-7ca7-8000-000000000002',
      name: 'Chiêu Lầu Thi',
      location: { lng: 104.5, lat: -100 },
    });
    expect(result.success).toBe(false);
  });

  test('should reject extra fields in strict mode', () => {
    const result = CreateAttractionSchema.safeParse({
      regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
      categoryId: '3a552ef3-40e1-7ca7-8000-000000000002',
      name: 'Chiêu Lầu Thi',
      location: { lng: 104.5, lat: 22.6 },
      unknownField: 'hacked',
    });
    expect(result.success).toBe(false);
  });

  test('should trim name', () => {
    const result = CreateAttractionSchema.safeParse({
      regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
      categoryId: '3a552ef3-40e1-7ca7-8000-000000000002',
      name: '  Chiêu Lầu Thi  ',
      location: { lng: 104.5, lat: 22.6 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Chiêu Lầu Thi');
    }
  });

  test('should transform slug to lowercase', () => {
    const result = CreateAttractionSchema.safeParse({
      regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
      categoryId: '3a552ef3-40e1-7ca7-8000-000000000002',
      name: 'Chiêu Lầu Thi',
      slug: 'CHIEU-LAU-THI',
      location: { lng: 104.5, lat: 22.6 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe('chieu-lau-thi');
    }
  });
});

describe('UpdateAttractionSchema', () => {
  test('should allow partial update', () => {
    const result = UpdateAttractionSchema.safeParse({
      name: 'Updated Name',
    });
    expect(result.success).toBe(true);
  });

  test('should allow empty object', () => {
    const result = UpdateAttractionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  test('should reject extra fields in strict mode', () => {
    const result = UpdateAttractionSchema.safeParse({
      name: 'Updated',
      unknownField: 'hacked',
    });
    expect(result.success).toBe(false);
  });

  test('should validate status enum', () => {
    const result = UpdateAttractionSchema.safeParse({
      status: 'invalid_status',
    });
    expect(result.success).toBe(false);
  });
});

describe('ListAttractionsQuerySchema', () => {
  test('should use default page and limit when not provided', () => {
    const result = ListAttractionsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  test('should transform string page and limit to numbers', () => {
    const result = ListAttractionsQuerySchema.safeParse({
      page: '3',
      limit: '50',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  test('should reject limit > 100', () => {
    const result = ListAttractionsQuerySchema.safeParse({
      limit: '200',
    });
    expect(result.success).toBe(false);
  });

  test('should reject page < 1', () => {
    const result = ListAttractionsQuerySchema.safeParse({
      page: '0',
    });
    expect(result.success).toBe(false);
  });
});

describe('AttractionNearbyQuerySchema', () => {
  test('should validate valid nearby query', () => {
    const result = AttractionNearbyQuerySchema.safeParse({
      lng: '104.5',
      lat: '22.6',
      radius: '5000',
      limit: '10',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lng).toBe(104.5);
      expect(result.data.lat).toBe(22.6);
      expect(result.data.radius).toBe(5000);
      expect(result.data.limit).toBe(10);
    }
  });

  test('should use default radius and limit when not provided', () => {
    const result = AttractionNearbyQuerySchema.safeParse({
      lng: '104.5',
      lat: '22.6',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.radius).toBe(5000);
      expect(result.data.limit).toBe(20);
    }
  });

  test('should fail if lng is missing', () => {
    const result = AttractionNearbyQuerySchema.safeParse({
      lat: '22.6',
    });
    expect(result.success).toBe(false);
  });
});

describe('AttractionIdParamsSchema', () => {
  test('should validate a valid UUID', () => {
    const result = AttractionIdParamsSchema.safeParse({
      id: '3a552ef3-40e1-7ca7-8000-000000000001',
    });
    expect(result.success).toBe(true);
  });

  test('should fail for non-UUID', () => {
    const result = AttractionIdParamsSchema.safeParse({
      id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('AttractionSlugParamsSchema', () => {
  test('should validate a valid slug', () => {
    const result = AttractionSlugParamsSchema.safeParse({
      slug: 'chieu-lau-thi',
    });
    expect(result.success).toBe(true);
  });

  test('should fail for uppercase slug', () => {
    const result = AttractionSlugParamsSchema.safeParse({
      slug: 'CHIEU-LAU-THI',
    });
    expect(result.success).toBe(false);
  });

  test('should fail for empty slug', () => {
    const result = AttractionSlugParamsSchema.safeParse({
      slug: '',
    });
    expect(result.success).toBe(false);
  });
});
