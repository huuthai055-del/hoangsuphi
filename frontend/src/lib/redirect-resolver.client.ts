import { z } from 'zod';
import { env } from '@/config/env';
import { isCanonicalRedirectTarget, normalizePublicPathname, shouldBypassRedirectMiddleware } from './redirect-path';

export type RedirectResolution =
  | {
      kind: 'match';
      targetPath: string;
      statusCode: 301 | 302;
    }
  | {
      kind: 'no-match';
    }
  | {
      kind: 'unavailable';
    };

const ResolverResponseSchema = z.object({
  targetPath: z
    .string()
    .min(1)
    .max(500)
    .refine(isCanonicalRedirectTarget, 'Target path must be a canonical internal public path'),
  statusCode: z.union([z.literal(301), z.literal(302)]),
}).strict();

const ResolverEnvelopeSchema = z.object({
  data: ResolverResponseSchema.nullable(),
}).strict();

export class RedirectResolverClient {
  static async resolve(canonicalPathname: string): Promise<RedirectResolution> {
    if (
      normalizePublicPathname(canonicalPathname) !== canonicalPathname ||
      shouldBypassRedirectMiddleware(canonicalPathname)
    ) {
      return { kind: 'unavailable' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), env.REDIRECT_RESOLVER_TIMEOUT_MS);

    try {
      const url = new URL('/api/v1/redirects/resolve', env.INTERNAL_BACKEND_URL);
      url.searchParams.set('path', canonicalPathname);

      const response = await fetch(url.toString(), {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) {
        return { kind: 'unavailable' };
      }

      const rawJson: unknown = await response.json();
      const parsed = ResolverEnvelopeSchema.safeParse(rawJson);

      if (!parsed.success) {
        return { kind: 'unavailable' };
      }

      if (parsed.data.data === null) {
        return { kind: 'no-match' };
      }

      const { targetPath, statusCode } = parsed.data.data;

      // Ensure the target is not the same as the source
      if (targetPath === canonicalPathname) {
        return { kind: 'unavailable' };
      }

      return {
        kind: 'match',
        targetPath,
        statusCode,
      };

    } catch {
      return { kind: 'unavailable' };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
