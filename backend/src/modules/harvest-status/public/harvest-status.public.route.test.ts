import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { container } from '@/common/di/container';
import { createApp } from '../../../app';
import { HarvestStatusPublicController } from './harvest-status.public.controller';
import type { HarvestStatusPublicService } from './harvest-status.public.service';

describe('Harvest Status public HTTP contract', () => {
  const getCurrent = mock(async () => ({
    data: [],
    pagination: { nextCursor: null, hasNextPage: false },
  }));
  const getRegionTimeline = mock(async () => ({
    data: {
      region: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Ban Phung',
        slug: 'ban-phung',
        level: 4,
      },
      current: null,
      timeline: [],
    },
    pagination: { nextCursor: null, hasNextPage: false },
  }));

  beforeEach(() => {
    getCurrent.mockClear();
    getRegionTimeline.mockClear();
    container.reset();
    container.register(
      'HarvestStatusPublicController',
      new HarvestStatusPublicController({ getCurrent, getRegionTimeline } as unknown as HarvestStatusPublicService)
    );
  });

  afterEach(() => container.reset());

  it('serves both routes anonymously with no-store', async () => {
    const current = await createApp().request('/api/v1/harvest-status');
    expect(current.status).toBe(200);
    expect(current.headers.get('cache-control')).toBe('no-store');
    expect(getCurrent).toHaveBeenCalledWith({ limit: 20 });

    const timeline = await createApp().request('/api/v1/harvest-status/regions/ban-phung?limit=1');
    expect(timeline.status).toBe(200);
    expect(timeline.headers.get('cache-control')).toBe('no-store');
    expect(getRegionTimeline).toHaveBeenCalledWith('ban-phung', { limit: 1 });
  });

  it('rejects unknown, duplicate, malformed, injection, and oversized inputs', async () => {
    const urls = [
      '/api/v1/harvest-status?page=1',
      '/api/v1/harvest-status?limit=1&limit=2',
      '/api/v1/harvest-status?limit=20%20UNION%20SELECT',
      '/api/v1/harvest-status?cursor=%27%3B%20DROP%20TABLE%20harvest_updates%3B--',
      `/api/v1/harvest-status/regions/${'a'.repeat(121)}`,
      '/api/v1/harvest-status/regions/not_valid',
    ];
    for (const url of urls) {
      const response = await createApp().request(url);
      expect(response.status).toBe(400);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('content-type')).toContain('application/problem+json');
    }
    expect(getCurrent).not.toHaveBeenCalled();
    expect(getRegionTimeline).not.toHaveBeenCalled();
  });

  it('does not touch Redis even when global rate limiting is enabled', async () => {
    const previousFlag = process.env.ENABLE_RATE_LIMIT_FOR_TESTS;
    process.env.ENABLE_RATE_LIMIT_FOR_TESTS = 'true';
    const increment = mock(async () => {
      throw new Error('Redis must not be used by public Harvest GET');
    });
    container.register('RedisStore', { increment });
    try {
      const response = await createApp().request('/api/v1/harvest-status');
      expect(response.status).toBe(200);
      expect(increment).not.toHaveBeenCalled();
    } finally {
      if (previousFlag === undefined) Reflect.deleteProperty(process.env, 'ENABLE_RATE_LIMIT_FOR_TESTS');
      else process.env.ENABLE_RATE_LIMIT_FOR_TESTS = previousFlag;
    }
  });
});
