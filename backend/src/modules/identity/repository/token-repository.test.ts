import { beforeEach, describe, expect, mock, it } from 'bun:test';

let mockResolveValue: any = undefined;

const selectSpy = mock(() => mockDbChain);
const insertSpy = mock(() => mockDbChain);
const updateSpy = mock(() => mockDbChain);
const deleteSpy = mock(() => mockDbChain);
const valuesSpy = mock(() => mockDbChain);
const whereSpy = mock(() => mockDbChain);
const setSpy = mock(() => mockDbChain);
const returningSpy = mock(() => mockDbChain);

const mockDbChain = {
  select: selectSpy,
  from: () => mockDbChain,
  where: whereSpy,
  limit: () => mockDbChain,
  insert: insertSpy,
  values: valuesSpy,
  onConflictDoNothing: () => mockDbChain,
  update: updateSpy,
  set: setSpy,
  returning: returningSpy,
  delete: deleteSpy,
};

Object.defineProperty(mockDbChain, 'then', {
  value: (onFulfilled: any) => {
    return Promise.resolve(mockResolveValue).then(onFulfilled);
  },
  configurable: true,
  writable: true,
});

mock.module('@/lib/database/client', () => {
  return {
    db: mockDbChain,
    runInTransaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
  };
});

import { DrizzleOneTimeTokenRepository } from './drizzle-one-time-token.repository';

describe('DrizzleOneTimeTokenRepository', () => {
  let repo: DrizzleOneTimeTokenRepository;
  const testUserId = '019f4264-a179-7672-b7b6-278802ae1916';

  beforeEach(() => {
    repo = new DrizzleOneTimeTokenRepository();
    mockResolveValue = undefined;
    mock.restore();
  });

  it('should generate a 32-byte secure token and hash it during createToken', async () => {
    mockResolveValue = undefined;
    const rawToken = await repo.createToken(testUserId, 'email_verification', 86400);

    expect(rawToken.length).toBe(43); // base64url of 32 bytes
    expect(insertSpy).toHaveBeenCalled();
    expect(valuesSpy).toHaveBeenCalled();
  });

  it('should revoke previous pending tokens', async () => {
    mockResolveValue = undefined;
    await repo.revokePendingTokens(testUserId, 'password_reset');

    expect(updateSpy).toHaveBeenCalled();
    expect(setSpy).toHaveBeenCalled();
    expect(whereSpy).toHaveBeenCalled();
  });

  it('should correctly consume an unused token', async () => {
    // returning returns an array of updated rows
    mockResolveValue = [{ userId: testUserId }];
    
    // Simulate consuming
    const consumedUserId = await repo.consumeToken('some-raw-token', 'password_reset');
    
    expect(consumedUserId).toBe(testUserId);
    expect(updateSpy).toHaveBeenCalled();
    expect(setSpy).toHaveBeenCalled();
    expect(whereSpy).toHaveBeenCalled();
    expect(returningSpy).toHaveBeenCalled();
  });

  it('should return null if token is not found or expired on consume', async () => {
    mockResolveValue = [];
    
    const consumedUserId = await repo.consumeToken('some-raw-token', 'email_verification');
    
    expect(consumedUserId).toBeNull();
    expect(updateSpy).toHaveBeenCalled();
    expect(whereSpy).toHaveBeenCalled();
  });
});
