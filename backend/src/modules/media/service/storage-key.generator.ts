import { generateUuidV7 } from '@/common/utils/uuid';

export const StorageKeyGenerator = {
  generate(fileName: string, now: Date = new Date()): { id: string; storageKey: string } {
    const id = generateUuidV7();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const storageKey = `uploads/${year}/${month}/${id}-${fileName}`;
    return { id, storageKey };
  }
};
