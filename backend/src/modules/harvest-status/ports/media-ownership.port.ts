import type { TransactionClient } from '@/lib/database/client';

export interface IHarvestMediaOwnershipPort {
  /**
   * Validates and assigns ownership for a set of media to a Harvest Update.
   * Throws an error if any media is ineligible (e.g. not READY, not IMAGE, 
   * deleted, owned by someone else, or uploaded by a different user).
   */
  assignHarvestMedia(props: {
    harvestUpdateId: string;
    mediaIds: string[];
    uploaderId: string;
    tx?: TransactionClient;
  }): Promise<void>;

  /**
   * Validates media before publishing a draft.
   */
  validateMediaForPublish(props: {
    harvestUpdateId: string;
    tx?: TransactionClient;
  }): Promise<void>;
}
