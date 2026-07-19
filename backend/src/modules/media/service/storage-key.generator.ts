import { generateUuidV7 } from '@/common/utils/uuid';

export const StorageKeyGenerator = {
  generate(
    fileName: string,
    now: Date = new Date(),
    provider: 'LOCAL' | 'CLOUDINARY' = 'LOCAL'
  ): { id: string; storageKey: string } {
    const id = generateUuidV7();
    if (provider === 'CLOUDINARY') {
      const env = process.env.NODE_ENV ?? 'development';
      const storageKey = `hoangsuphi/${env}/media/${id}/master`;
      return { id, storageKey };
    }
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const storageKey = `uploads/${year}/${month}/${id}-${fileName}`;
    return { id, storageKey };
  },

  generateVariantKey(
    mediaId: string,
    variantType: string,
    provider: 'LOCAL' | 'CLOUDINARY' = 'CLOUDINARY',
    now: Date = new Date()
  ): string {
    if (provider === 'CLOUDINARY') {
      const env = process.env.NODE_ENV ?? 'development';
      return `hoangsuphi/${env}/media/${mediaId}/${variantType}`;
    }
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `uploads/${year}/${month}/${mediaId}-${variantType}.webp`;
  },
};
