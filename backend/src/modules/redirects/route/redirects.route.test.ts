import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { container } from '../../../common/di/container';
import { createApp } from '../../../app';
import type { MiddlewareHandler } from 'hono';
import { Redirect } from '../domain/redirect.entity';
import { RedirectsController } from './redirects.controller';
import type { IRedirectsService, RedirectResolution } from '../service/redirects.service';

describe('redirect routes', () => {
  const adminId = '11111111-1111-1111-1111-111111111111';
  let allowSystemWrite = true;
  const redirect = Redirect.create({
    id: '019f4264-a179-7672-b7b6-278802ae1916',
    sourcePath: '/old-path',
    targetPath: '/new-path',
    createdBy: adminId,
  });

  const resolveRedirect = mock(async (): Promise<RedirectResolution | null> => ({
    targetPath: '/new-path',
    statusCode: 302,
  }));
  const createRedirect = mock(async (): Promise<Redirect> => redirect);
  const updateRedirect = mock(async (): Promise<Redirect> => redirect);
  const deleteRedirect = mock(async (): Promise<void> => undefined);
  const listRedirects = mock(async () => ({ items: [redirect], nextCursor: 'next-cursor' }));
  const getRedirectById = mock(async (): Promise<Redirect> => redirect);

  beforeEach(() => {
    allowSystemWrite = true;
    resolveRedirect.mockReset().mockResolvedValue({ targetPath: '/new-path', statusCode: 302 });
    createRedirect.mockReset().mockResolvedValue(redirect);
    updateRedirect.mockReset().mockResolvedValue(redirect);
    deleteRedirect.mockReset().mockResolvedValue(undefined);
    listRedirects.mockReset().mockResolvedValue({ items: [redirect], nextCursor: 'next-cursor' });
    getRedirectById.mockReset().mockResolvedValue(redirect);

    const service: IRedirectsService = {
      resolveRedirect,
      createRedirect,
      updateRedirect,
      deleteRedirect,
      listRedirects,
      getRedirectById,
    };
    const authGuard: MiddlewareHandler = async (c, next) => {
      c.set('user', {
        id: adminId,
        email: 'admin@hoangsuphi.vn',
        sessionId: null,
        permissionsVersion: 1,
        permissions: allowSystemWrite ? ['system:write'] : [],
        roles: ['admin'],
      });
      await next();
    };
    container.reset();
    container.register('AuthGuard', authGuard);
    container.register('RedirectsController', new RedirectsController(service));
  });

  afterEach(() => {
    container.reset();
  });

  it('returns a no-store, typed public resolution envelope', async () => {
    const response = await createApp().request('/api/v1/redirects/resolve?path=%2FOLD-PATH%3Futm%3Dtest');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ data: { targetPath: '/new-path', statusCode: 302 } });
    expect(resolveRedirect).toHaveBeenCalledWith('/OLD-PATH?utm=test');
  });

  it('returns a stable 200 data:null response when no redirect exists', async () => {
    resolveRedirect.mockResolvedValueOnce(null);
    const response = await createApp().request('/api/v1/redirects/resolve?path=%2Funknown');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: null });
  });

  it('requires system:write and uses the authenticated user as the audit actor', async () => {
    const body = JSON.stringify({ sourcePath: '/old-path', targetPath: '/new-path', statusCode: 301 });
    const allowed = await createApp().request('/api/v1/admin/redirects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    expect(allowed.status).toBe(201);
    expect((await allowed.json()).data.id).toBe(redirect.id);
    expect(createRedirect).toHaveBeenCalledWith(
      { sourcePath: '/old-path', targetPath: '/new-path', statusCode: 301 },
      adminId
    );

    allowSystemWrite = false;
    const denied = await createApp().request('/api/v1/admin/redirects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    expect(denied.status).toBe(403);
  });

  it('strictly rejects unsupported status codes and unknown request fields', async () => {
    const response = await createApp().request('/api/v1/admin/redirects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourcePath: '/old-path',
        targetPath: '/new-path',
        statusCode: 308,
        unexpected: true,
      }),
    });
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe('VAL_001');
  });

  it('supports PATCH in the browser CORS preflight', async () => {
    const response = await createApp().request('/api/v1/admin/redirects/id', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'PATCH',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });
    expect(response.headers.get('access-control-allow-methods')).toContain('PATCH');
  });
});
