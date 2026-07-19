import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { createApp } from '../../../app';
import { container } from '@/common/di/container';
import type { MiddlewareHandler } from 'hono';
import { HarvestStatusController } from './harvest-status.controller';
import type { HarvestStatusService } from '../service/harvest-status.service';
import { AuthenticationError } from '@/common/errors/http.errors';

describe('harvest status admin routes', () => {
  const adminId = '11111111-1111-1111-1111-111111111111';
  const harvestUpdateId = '22222222-2222-2222-2222-222222222222';
  const regionId = '33333333-3333-3333-3333-333333333333';
  let allowHarvestWrite = true;

  const create = mock(async () => ({ id: harvestUpdateId }));
  const patch = mock(async () => undefined);
  const publish = mock(async () => undefined);
  const archive = mock(async () => undefined);

  beforeEach(() => {
    allowHarvestWrite = true;
    create.mockReset().mockResolvedValue({ id: harvestUpdateId });
    patch.mockReset().mockResolvedValue(undefined);
    publish.mockReset().mockResolvedValue(undefined);
    archive.mockReset().mockResolvedValue(undefined);

    const service = { create, patch, publish, archive } as unknown as HarvestStatusService;
    const authGuard: MiddlewareHandler = async (c, next) => {
      c.set('user', {
        id: adminId,
        email: 'admin@hoangsuphi.vn',
        sessionId: null,
        permissionsVersion: 1,
        permissions: allowHarvestWrite ? ['harvest:write'] : [],
        roles: ['admin'],
      });
      await next();
    };
    container.reset();
    container.register('AuthGuard', authGuard);
    container.register('HarvestStatusController', new HarvestStatusController(service));
  });

  afterEach(() => {
    container.reset();
  });

  it('creates a draft through the authenticated actor and returns the standard envelope', async () => {
    const requestBody = {
      regionId,
      stage: 'GREEN',
      observedAt: '2026-07-19T10:00:00.000Z',
      title: 'Mùa lúa xanh',
      summary: 'Ruộng bậc thang đang vào mùa xanh tươi tại địa phương.',
      mediaIds: [],
    };
    const response = await createApp().request('/api/v1/admin/harvest-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      data: { id: harvestUpdateId },
      meta: null,
      error: null,
    });
    expect(create).toHaveBeenCalledWith({ ...requestBody, advisory: null }, adminId);
  });

  it('uses the validator context and append-only attachMediaIds when patching', async () => {
    const body = { stage: 'RIPENING', attachMediaIds: [harvestUpdateId] };
    const response = await createApp().request(`/api/v1/admin/harvest-status/${harvestUpdateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { success: true }, meta: null, error: null });
    expect(patch).toHaveBeenCalledWith(harvestUpdateId, body, adminId);
  });

  it('rejects the obsolete replacement field and unknown request fields', async () => {
    const response = await createApp().request(`/api/v1/admin/harvest-status/${harvestUpdateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaIds: [harvestUpdateId], unexpected: true }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe('VAL_001');
  });

  it('requires harvest:write for all lifecycle actions', async () => {
    allowHarvestWrite = false;
    const response = await createApp().request(`/api/v1/admin/harvest-status/${harvestUpdateId}/publish`, {
      method: 'POST',
    });

    expect(response.status).toBe(403);
    expect(publish).not.toHaveBeenCalled();
  });

  it('blocks anonymous callers from every admin lifecycle route', async () => {
    const anonymousGuard: MiddlewareHandler = async () => {
      throw new AuthenticationError();
    };
    container.register('AuthGuard', anonymousGuard);
    const requests = [
      createApp().request('/api/v1/admin/harvest-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionId,
          stage: 'GREEN',
          observedAt: '2026-07-19T10:00:00.000Z',
          title: 'Green harvest season',
          summary: 'A sufficiently long harvest summary for route validation.',
          mediaIds: [],
        }),
      }),
      createApp().request(`/api/v1/admin/harvest-status/${harvestUpdateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'GOLDEN' }),
      }),
      createApp().request(`/api/v1/admin/harvest-status/${harvestUpdateId}/publish`, { method: 'POST' }),
      createApp().request(`/api/v1/admin/harvest-status/${harvestUpdateId}/archive`, { method: 'POST' }),
    ];
    for (const response of await Promise.all(requests)) expect(response.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
    expect(archive).not.toHaveBeenCalled();
  });

  it('passes the authenticated actor to publish and archive', async () => {
    const published = await createApp().request(`/api/v1/admin/harvest-status/${harvestUpdateId}/publish`, {
      method: 'POST',
    });
    const archived = await createApp().request(`/api/v1/admin/harvest-status/${harvestUpdateId}/archive`, {
      method: 'POST',
    });

    expect(published.status).toBe(200);
    expect(archived.status).toBe(200);
    expect(publish).toHaveBeenCalledWith(harvestUpdateId, adminId);
    expect(archive).toHaveBeenCalledWith(harvestUpdateId, adminId);
  });
});
