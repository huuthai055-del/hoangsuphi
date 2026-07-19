import { describe, expect, it } from 'bun:test';
import { parseHarvestPublicQuery } from '../dto/harvest-status.public.dto';
import { HarvestStatusCursorCodec } from './harvest-status.cursor';

const codec = new HarvestStatusCursorCodec({
  activeKeyId: 'v1',
  keys: { v1: 'harvest-cursor-test-secret-at-least-32-bytes' },
});

describe('Harvest public DTO and signed cursor', () => {
  it('uses limit 20 by default and strictly accepts only limit/cursor', () => {
    expect(parseHarvestPublicQuery(new URLSearchParams())).toEqual({ limit: 20 });
    expect(parseHarvestPublicQuery(new URLSearchParams('limit=1'))).toEqual({ limit: 1 });
    expect(parseHarvestPublicQuery(new URLSearchParams('limit=50'))).toEqual({ limit: 50 });

    for (const query of [
      'limit=0',
      'limit=51',
      'limit=-1',
      'limit=1.5',
      'limit=20abc',
      'limit=',
      'limit=2&limit=3',
      'page=1',
    ]) {
      expect(() => parseHarvestPublicQuery(new URLSearchParams(query))).toThrow();
    }
  });

  it('roundtrips full current and timeline ordering keys', () => {
    const currentFingerprint = codec.fingerprint('current', 20);
    const current = {
      scope: 'current' as const,
      observedAt: new Date('2026-07-20T01:00:00.000Z'),
      regionName: 'Ban Phung',
      regionId: '11111111-1111-4111-8111-111111111111',
    };
    const currentCursor = codec.encode(current, currentFingerprint);
    expect(codec.decode(currentCursor, currentFingerprint, 'current')).toEqual(current);

    const timelineFingerprint = codec.fingerprint(
      'timeline',
      20,
      '22222222-2222-4222-8222-222222222222'
    );
    const timeline = {
      scope: 'timeline' as const,
      observedAt: new Date('2026-07-20T01:00:00.000Z'),
      publishedAt: new Date('2026-07-20T02:00:00.000Z'),
      id: '33333333-3333-4333-8333-333333333333',
    };
    const timelineCursor = codec.encode(timeline, timelineFingerprint);
    expect(codec.decode(timelineCursor, timelineFingerprint, 'timeline')).toEqual(timeline);
  });

  it('rejects tampering and endpoint, limit, or region fingerprint mismatch', () => {
    const fingerprint = codec.fingerprint('current', 20);
    const cursor = codec.encode(
      {
        scope: 'current',
        observedAt: new Date('2026-07-20T01:00:00.000Z'),
        regionName: 'Ban Phung',
        regionId: '11111111-1111-4111-8111-111111111111',
      },
      fingerprint
    );
    const tampered = `${cursor.slice(0, -1)}${cursor.endsWith('A') ? 'B' : 'A'}`;

    expect(() => codec.decode(tampered, fingerprint, 'current')).toThrow();
    expect(() => codec.decode(cursor, codec.fingerprint('current', 10), 'current')).toThrow();
    expect(() => codec.decode(cursor, codec.fingerprint('timeline', 20, '22222222-2222-4222-8222-222222222222'), 'timeline')).toThrow();
  });
});
