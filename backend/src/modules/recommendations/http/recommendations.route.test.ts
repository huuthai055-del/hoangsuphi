import { expect, test, describe } from 'bun:test';
import { Hono } from 'hono';
import { createRecommendationsRouter } from './recommendations.routes';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from '../application/recommendations.service';
import type { IRecommendationsRepository } from '../repository/recommendations-repository.interface';
import { errorHandlerMiddleware } from '@/middleware/error';

class MockRepository implements IRecommendationsRepository {
  async resolvePublicSource(sourceType: any, sourceId: any) {
    if (sourceId === '018f0a0e-a5a4-7f1a-b33a-123456789abc') {
      return { sourceType, id: sourceId, regionId: '018f0a0e-a5a4-7f1a-b33a-region123456', location: { x: 10, y: 20 } };
    }
    return null;
  }
  async findNearby(_c: any) { return []; }
  async findSameRegion(_c: any) { return []; }
  async findTopRated(_c: any) { return []; }
  async findNewest(_c: any) { return []; }
}

describe('Recommendations Route Integration', () => {
  const repository = new MockRepository();
  const service = new RecommendationsService(repository);
  const controller = new RecommendationsController(service);
  
  const app = new Hono();
  app.route('/recommendations', createRecommendationsRouter(controller));
  app.onError(errorHandlerMiddleware());

  test('returns 400 for missing required params in nearby strategy', async () => {
    const res = await app.request('/recommendations?strategy=nearby');
    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
    const body = await res.json();
    expect(body.code).toBe('VAL_001');
  });

  test('returns 404 for unknown source in nearby strategy', async () => {
    const res = await app.request('/recommendations?strategy=nearby&sourceType=place&sourceId=018f0a0e-a5a4-7f1a-b33a-000000000000');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
    const body = await res.json();
    expect(body.code).toBe('SYS_002');
    expect(body.detail).toBe('RECOMMENDATION_SOURCE_NOT_FOUND_OR_UNAVAILABLE');
  });

  test('returns 200 with no-store cache headers for valid nearby query', async () => {
    const res = await app.request('/recommendations?strategy=nearby&sourceType=place&sourceId=018f0a0e-a5a4-7f1a-b33a-123456789abc');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
    expect(res.headers.get('Pragma')).toBe('no-cache');
    
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.meta.strategy).toBe('nearby');
    expect(body.meta.limit).toBe(6);
    expect(body.error).toBeNull();
  });

  test('returns 200 for top_rated query without source fields', async () => {
    const res = await app.request('/recommendations?strategy=top_rated');
    expect(res.status).toBe(200);
    
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.meta.strategy).toBe('top_rated');
    expect(body.meta.limit).toBe(6);
    expect(body.error).toBeNull();
  });

  test('returns 400 for top_rated query with source fields', async () => {
    const res = await app.request('/recommendations?strategy=top_rated&sourceType=place&sourceId=018f0a0e-a5a4-7f1a-b33a-123456789abc');
    expect(res.status).toBe(400);
  });

  test('rejects repeated strategy values instead of accepting Hono\'s first value', async () => {
    const res = await app.request('/recommendations?strategy=top_rated&strategy=newest');
    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
    const body = await res.json();
    expect(body.code).toBe('VAL_001');
  });
});
