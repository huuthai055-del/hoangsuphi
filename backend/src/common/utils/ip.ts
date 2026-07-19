import type { Context } from 'hono';
import { getConnInfo } from 'hono/bun';
import { env } from '@/config/env';

export function extractClientIp(c: Context): string {
  if (env.TRUST_PROXY) {
    const cfIp = c.req.header('cf-connecting-ip');
    if (cfIp) return cfIp.trim();

    const forwardedFor = c.req.header('x-forwarded-for');
    if (forwardedFor) {
      const firstIp = forwardedFor.split(',')[0]?.trim();
      if (firstIp) return firstIp;
    }

    const realIp = c.req.header('x-real-ip');
    if (realIp) return realIp.trim();
  }

  // 1. Try hono/bun getConnInfo (native Bun socket remote address)
  try {
    const connInfo = getConnInfo(c);
    if (connInfo?.remote?.address) {
      return connInfo.remote.address;
    }
  } catch {
    // Ignore if not running in Bun server environment or mocked context
  }

  // 2. Try Node/custom socket remote address fallback
  const nodeReq = (c.env as { incoming?: { socket?: { remoteAddress?: string } } })?.incoming;
  if (nodeReq?.socket?.remoteAddress) {
    return nodeReq.socket.remoteAddress;
  }

  // 3. If running in test environment where socket/connInfo is not exposed by mock Context
  const testHeaderIp =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('cf-connecting-ip')?.trim() ||
    c.req.header('x-real-ip')?.trim();
  if (env.NODE_ENV === 'test' && testHeaderIp) {
    return testHeaderIp;
  }

  return '127.0.0.1';
}
