import { describe, expect, test } from 'bun:test';
import { Article } from '@/modules/articles/domain/article.entity';
import { Attraction } from '@/modules/attractions/domain/attraction.entity';
import { Business } from '@/modules/businesses/domain/business.entity';
import { TouristPlace } from '@/modules/regions/domain/place.entity';
import { Region } from '@/modules/regions/domain/region.aggregate';
import { GPSLocation } from '@/modules/regions/domain/value-objects/gps-location.vo';
import { LtreePath } from '@/modules/regions/domain/value-objects/ltree-path.vo';

describe('Slug Immutability Regression Check', () => {
  test('Article slug is immutable once published', () => {
    const article = (Article as any).rehydrate({
      id: '019f4bc4-f550-7d52-bba4-3b6258b55703',
      title: 'Kinh nghiệm phượt',
      slug: 'kinh-nghiem-phuot',
      excerpt: 'Excerpt',
      content: 'Content',
      thumbnailId: null,
      authorId: '019f4bc4-f550-7d52-bba4-3b6258b55705',
      categoryId: '019f4bc4-f550-7d52-bba4-3b6258b55701',
      status: 'published',
      viewCount: 0,
      isFeatured: false,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    expect(() => {
      article.setTitleInternal?.('New Title', 'new-slug');
    }).toThrow();
  });

  test('Region slug is immutable once active', () => {
    const region = new Region(
      '019f4bc4-f550-7d52-bba4-3b6258b55701',
      null,
      'Hoàng Su Phì',
      'hoang-su-phi',
      1,
      new LtreePath('hoang_su_phi'),
      null,
      null,
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );

    let throws = false;
    try {
      region.rename('New Name', 'new-slug');
    } catch {
      throws = true;
    }

    expect(throws).toBe(true);
  });

  test('TouristPlace slug is immutable once active', () => {
    const place = new TouristPlace(
      '019f4bc4-f550-7d52-bba4-3b6258b55702',
      '019f4bc4-f550-7d52-bba4-3b6258b55701',
      'Bản Phùng',
      'ban-phung',
      new GPSLocation(104.5, 22.5),
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );

    let throws = false;
    try {
      place.rename('New Name', 'new-slug');
    } catch {
      throws = true;
    }

    expect(throws).toBe(true);
  });

  test('Business slug is immutable once active', () => {
    const business = Business.rehydrate({
      id: '019f4bc4-f550-7d52-bba4-3b6258b55703',
      regionId: '019f4bc4-f550-7d52-bba4-3b6258b55701',
      businessTypeId: '019f4bc4-f550-7d52-bba4-3b6258b55705',
      name: 'Homestay Bản Phùng',
      slug: 'homestay-ban-phung',
      location: new GPSLocation(104.5, 22.5),
      description: null,
      coverUrl: null,
      priceMin: null,
      priceMax: null,
      status: 'active',
      amenityIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    let throws = false;
    try {
      business.update({ slug: 'new-slug' });
    } catch {
      throws = true;
    }

    expect(throws).toBe(true);
  });

  test('Attraction slug is immutable once active', () => {
    const attraction = Attraction.rehydrate({
      id: '019f4bc4-f550-7d52-bba4-3b6258b55704',
      regionId: '019f4bc4-f550-7d52-bba4-3b6258b55701',
      categoryId: '019f4bc4-f550-7d52-bba4-3b6258b55706',
      name: 'Cổng trời Hoàng Su Phì',
      slug: 'cong-troi-hoang-su-phi',
      location: new GPSLocation(104.5, 22.5),
      description: null,
      coverUrl: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    let throws = false;
    try {
      attraction.update({ slug: 'new-slug' });
    } catch {
      throws = true;
    }

    expect(throws).toBe(true);
  });
});
