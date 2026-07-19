import { db } from '@/lib/database/client';
import { logger } from '@/lib/logger';
import { CloudinaryStorageAdapter } from '../repository/cloudinary-storage.adapter';
import { LocalStorageAdapter } from '../repository/local-storage.adapter';
import { DrizzleMediaRepository } from '../repository/media.repository';
import { MediaPurgeService } from '../service/media-purge.service';
import { MediaStorageResolver } from '../service/media-storage.resolver';

const repository = new DrizzleMediaRepository(db);
const resolver = new MediaStorageResolver(
  new LocalStorageAdapter(),
  new CloudinaryStorageAdapter()
);
const service = new MediaPurgeService(repository, resolver);

const result = await service.purgeExpired({ retentionDays: 30, limit: 100 });
logger.info({ stage: 'retention-purge', ...result }, 'Media retention purge completed');
if (result.failed > 0) process.exitCode = 1;
