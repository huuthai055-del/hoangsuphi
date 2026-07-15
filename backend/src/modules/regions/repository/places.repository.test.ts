import { expect, test, describe } from 'bun:test';
import { TouristPlaceMapper } from './places.mapper';
import { TouristPlace } from '../domain/place.entity';

describe('TouristPlaceMapper', () => {
  test('should map raw DB row to domain entity and back', () => {
    const raw = {
      id: '3a552ef3-40e1-7ca7-8000-000000000001',
      regionId: '3a552ef3-40e1-7ca7-8000-000000000002',
      name: 'Bản Phùng Rice Terrace',
      slug: 'ban-phung-rice-terrace',
      location: { lng: 104.5, lat: 22.6 },
      description: 'Stunning rice terraces',
      coverUrl: 'https://example.com/cover.jpg',
      createdAt: new Date('2026-07-07T12:00:00Z'),
      updatedAt: new Date('2026-07-07T12:00:00Z'),
      deletedAt: null,
    };

    const domain = TouristPlaceMapper.toDomain(raw);
    expect(domain).toBeInstanceOf(TouristPlace);
    expect(domain.id).toBe(raw.id);
    expect(domain.location.lng).toBe(raw.location.lng);
    expect(domain.location.lat).toBe(raw.location.lat);

    const persistence = TouristPlaceMapper.toPersistence(domain);
    expect(persistence.id).toBe(raw.id);
    expect(persistence.location.lng).toBe(raw.location.lng);
    expect(persistence.location.lat).toBe(raw.location.lat);
  });
});
