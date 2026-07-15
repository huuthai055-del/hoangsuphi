import { createHmac } from 'node:crypto';
import { env } from '@/config/env';
import type { SearchCursorKeyring } from '../service/search-cursor';

function configuredKeyring(): SearchCursorKeyring | null {
  if (env.SEARCH_CURSOR_KEYS_JSON === undefined) return null;

  return {
    activeKeyId: env.SEARCH_CURSOR_ACTIVE_KEY_ID,
    keys: JSON.parse(env.SEARCH_CURSOR_KEYS_JSON) as Record<string, string>,
  };
}

function developmentKeyring(): SearchCursorKeyring {
  const activeKeyId = env.SEARCH_CURSOR_ACTIVE_KEY_ID;
  const secret = createHmac('sha256', env.JWT_ACCESS_SECRET)
    .update(`hoangsuphi:search-cursor:development:${activeKeyId}`)
    .digest('base64url');

  return { activeKeyId, keys: { [activeKeyId]: secret } };
}

/**
 * Staging and production are rejected by env validation unless an explicit keyring is supplied.
 * The deterministic fallback exists only to keep local development and isolated tests operable.
 */
export const SearchConfig = {
  cursorKeyring: configuredKeyring() ?? developmentKeyring(),
} as const;
