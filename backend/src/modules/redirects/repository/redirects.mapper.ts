import type { redirects } from '../../../lib/database/schema';
import type { RedirectProps } from '../domain/redirect.entity';
import { Redirect } from '../domain/redirect.entity';

type RedirectRow = typeof redirects.$inferSelect;

export function toRedirectDomain(raw: RedirectRow): Redirect {
  return Redirect.rehydrate({
    id: raw.id,
    sourcePath: raw.sourcePath,
    targetPath: raw.targetPath,
    statusCode: raw.statusCode as RedirectProps['statusCode'],
    isActive: raw.isActive,
    createdBy: raw.createdBy,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    deletedAt: raw.deletedAt,
  });
}

export function toRedirectPersistence(domain: Redirect): RedirectProps {
  return domain.toPersistence();
}
