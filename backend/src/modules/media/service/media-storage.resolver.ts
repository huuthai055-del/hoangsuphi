import type { IMediaStorage } from '../domain/storage.interface';

export class MediaStorageResolver {
  constructor(
    private readonly localStorage: IMediaStorage,
    private readonly cloudinaryStorage: IMediaStorage
  ) {}

  public resolve(provider: 'LOCAL' | 'CLOUDINARY'): IMediaStorage {
    if (provider === 'CLOUDINARY') {
      return this.cloudinaryStorage;
    }
    return this.localStorage;
  }
}
