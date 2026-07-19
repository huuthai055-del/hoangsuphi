import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { IRedisStore } from '../../../lib/redis/redis-store.interface';
import { Redirect } from '../domain/redirect.entity';
import { RedirectSelfError, ReservedRedirectSourceError } from '../domain/redirect.errors';
import type { IRedirectsRepository } from '../repository/redirects.repository.interface';
import { RedirectsService } from './redirects.service';

describe('RedirectsService', () => {
  const adminId = '11111111-1111-1111-1111-111111111111';
  let service: RedirectsService;
  let findById: ReturnType<typeof mock>;
  let findBySource: ReturnType<typeof mock>;
  let create: ReturnType<typeof mock>;
  let update: ReturnType<typeof mock>;
  let softDelete: ReturnType<typeof mock>;
  let list: ReturnType<typeof mock>;
  let get: ReturnType<typeof mock>;
  let set: ReturnType<typeof mock>;
  let remove: ReturnType<typeof mock>;

  beforeEach(() => {
    findById = mock(async () => null);
    findBySource = mock(async () => null);
    create = mock(async () => undefined);
    update = mock(async () => undefined);
    softDelete = mock(async () => undefined);
    list = mock(async () => ({ items: [], nextCursor: null }));
    get = mock(async () => null);
    set = mock(async () => undefined);
    remove = mock(async () => true);

    const repository: IRedirectsRepository = {
      findById,
      findBySource,
      create,
      update,
      softDelete,
      list,
    };
    const redis: IRedisStore = {
      get,
      set,
      setIfAbsent: mock(async () => true),
      delete: remove,
      increment: mock(async () => 1),
      ttl: mock(async () => -2),
    };
    service = new RedirectsService(repository, redis);
  });

  it('returns an intact 301/302 resolution from cache', async () => {
    get.mockResolvedValueOnce(JSON.stringify({ targetPath: '/cam-nang-moi', statusCode: 302 }));

    await expect(service.resolveRedirect('/CAM-NANG-CU?utm_source=test')).resolves.toEqual({
      targetPath: '/cam-nang-moi',
      statusCode: 302,
    });
    expect(findBySource).not.toHaveBeenCalled();
  });

  it('falls back to the database when cache is unavailable and writes a typed resolution', async () => {
    get.mockRejectedValueOnce(new Error('Redis unavailable'));
    findBySource.mockResolvedValueOnce(
      Redirect.create({
        id: '019f4264-a179-7672-b7b6-278802ae1916',
        sourcePath: '/old',
        targetPath: '/new',
        statusCode: 302,
        createdBy: adminId,
      })
    );

    await expect(service.resolveRedirect('/old')).resolves.toEqual({ targetPath: '/new', statusCode: 302 });
    expect(set).toHaveBeenCalledWith(
      'redirect:resolution:/old',
      JSON.stringify({ targetPath: '/new', statusCode: 302 }),
      60
    );
  });

  it('enforces reserved paths and self redirects before persistence', async () => {
    await expect(service.createRedirect({ sourcePath: '/api/v1/auth', targetPath: '/b' }, adminId)).rejects.toThrow(
      ReservedRedirectSourceError
    );
    await expect(service.createRedirect({ sourcePath: '/a', targetPath: '/A/' }, adminId)).rejects.toThrow(
      RedirectSelfError
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('creates an inactive 302 rule without populating the public cache', async () => {
    const redirect = await service.createRedirect(
      { sourcePath: '/old', targetPath: '/new', statusCode: 302, isActive: false },
      adminId
    );

    expect(redirect.isActive).toBe(false);
    expect(redirect.statusCode).toBe(302);
    expect(create).toHaveBeenCalledWith(redirect);
    expect(set).not.toHaveBeenCalled();
  });

  it('invalidates both keys and repopulates the changed active rule', async () => {
    const existing = Redirect.create({
      id: '019f4264-a179-7672-b7b6-278802ae1916',
      sourcePath: '/old',
      targetPath: '/target',
      createdBy: adminId,
    });
    findById.mockResolvedValueOnce(existing);

    await service.updateRedirect(
      existing.id,
      { sourcePath: '/new', targetPath: '/destination', statusCode: 302 },
      adminId
    );

    expect(remove).toHaveBeenCalledWith('redirect:resolution:/old');
    expect(remove).toHaveBeenCalledWith('redirect:resolution:/new');
    expect(set).toHaveBeenCalledWith(
      'redirect:resolution:/new',
      JSON.stringify({ targetPath: '/destination', statusCode: 302 }),
      60
    );
  });

  it('soft-deletes through the repository and invalidates the source cache', async () => {
    const existing = Redirect.create({
      id: '019f4264-a179-7672-b7b6-278802ae1916',
      sourcePath: '/old',
      targetPath: '/new',
      createdBy: adminId,
    });
    findById.mockResolvedValueOnce(existing);

    await service.deleteRedirect(existing.id, adminId);

    expect(existing.deletedAt).toBeInstanceOf(Date);
    expect(softDelete).toHaveBeenCalledWith(existing);
    expect(remove).toHaveBeenCalledWith('redirect:resolution:/old');
  });
});
