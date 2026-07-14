import { MediaDomainError } from './media-errors';

export type MediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';
export type MediaStatus = 'UPLOADING' | 'READY' | 'PROCESSING' | 'FAILED' | 'DELETED';

export interface MediaProps {
  id: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  mediaType: MediaType;
  fileSize: number;
  hash: string;
  status: MediaStatus;
  ownerType: string | null;
  ownerId: string | null;
  /** The user ID of whoever uploaded this file. Used for delete access control. */
  uploadedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class Media {
  private _id: string;
  private _fileName: string;
  private _storageKey: string;
  private _mimeType: string;
  private _mediaType: MediaType;
  private _fileSize: number;
  private _hash: string;
  private _status: MediaStatus;
  private _ownerType: string | null;
  private _ownerId: string | null;
  private _uploadedBy: string | null;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt: Date | null;

  private constructor(props: MediaProps) {
    this._id = props.id;
    this._fileName = props.fileName;
    this._storageKey = props.storageKey;
    this._mimeType = props.mimeType;
    this._mediaType = props.mediaType;
    this._fileSize = props.fileSize;
    this._hash = props.hash;
    this._status = props.status;
    this._ownerType = props.ownerType;
    this._ownerId = props.ownerId;
    this._uploadedBy = props.uploadedBy;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._deletedAt = props.deletedAt;
  }

  // Pure Validators
  private static validateId(id: string): void {
    if (!id || id.trim() === '') {
      throw new MediaDomainError('Media ID is required');
    }
  }

  private static validateFileName(fileName: string): void {
    if (!fileName || fileName.trim() === '') {
      throw new MediaDomainError('File name is required');
    }
  }

  private static validateStorageKey(storageKey: string): void {
    if (!storageKey || storageKey.trim() === '') {
      throw new MediaDomainError('Storage key is required');
    }
  }

  private static validateMimeType(mimeType: string): void {
    if (!mimeType || mimeType.trim() === '') {
      throw new MediaDomainError('MIME type is required');
    }
  }

  private static validateFileSize(fileSize: number): void {
    if (fileSize <= 0) {
      throw new MediaDomainError('File size must be greater than zero');
    }
  }

  private static validateHash(hash: string): void {
    if (!hash || hash.trim() === '') {
      throw new MediaDomainError('File hash is required');
    }
  }

  public static create(props: {
    id: string;
    fileName: string;
    storageKey: string;
    mimeType: string;
    mediaType: MediaType;
    fileSize: number;
    hash: string;
    ownerType?: string | null;
    ownerId?: string | null;
    uploadedBy?: string | null;
    now?: Date;
  }): Media {
    Media.validateId(props.id);
    Media.validateFileName(props.fileName);
    Media.validateStorageKey(props.storageKey);
    Media.validateMimeType(props.mimeType);
    Media.validateFileSize(props.fileSize);
    Media.validateHash(props.hash);

    const now = props.now ?? new Date();

    return new Media({
      id: props.id,
      fileName: props.fileName.trim(),
      storageKey: props.storageKey.trim(),
      mimeType: props.mimeType.trim(),
      mediaType: props.mediaType,
      fileSize: props.fileSize,
      hash: props.hash.trim(),
      status: 'UPLOADING',
      ownerType: props.ownerType ?? null,
      ownerId: props.ownerId ?? null,
      uploadedBy: props.uploadedBy ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  public static rehydrate(props: MediaProps): Media {
    Media.validateId(props.id);
    Media.validateFileName(props.fileName);
    Media.validateStorageKey(props.storageKey);
    Media.validateMimeType(props.mimeType);
    Media.validateFileSize(props.fileSize);
    Media.validateHash(props.hash);

    return new Media({
      id: props.id,
      fileName: props.fileName.trim(),
      storageKey: props.storageKey.trim(),
      mimeType: props.mimeType.trim(),
      mediaType: props.mediaType,
      fileSize: props.fileSize,
      hash: props.hash.trim(),
      status: props.status,
      ownerType: props.ownerType,
      ownerId: props.ownerId,
      uploadedBy: props.uploadedBy,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      deletedAt: props.deletedAt,
    });
  }

  // Getters
  public get id(): string { return this._id; }
  public get fileName(): string { return this._fileName; }
  public get storageKey(): string { return this._storageKey; }
  public get mimeType(): string { return this._mimeType; }
  public get mediaType(): MediaType { return this._mediaType; }
  public get fileSize(): number { return this._fileSize; }
  public get hash(): string { return this._hash; }
  public get status(): MediaStatus { return this._status; }
  public get ownerType(): string | null { return this._ownerType; }
  public get ownerId(): string | null { return this._ownerId; }
  public get uploadedBy(): string | null { return this._uploadedBy; }
  public get createdAt(): Date { return this._createdAt; }
  public get updatedAt(): Date { return this._updatedAt; }
  public get deletedAt(): Date | null { return this._deletedAt; }

  // Lifecycle State Transitions
  private ensureNotDeleted(): void {
    if (this._status === 'DELETED' || this._deletedAt) {
      throw new MediaDomainError('Cannot modify a deleted media file');
    }
  }

  private transitionTo(targetStatus: MediaStatus, now?: Date): void {
    this.ensureNotDeleted();

    const allowedTransitions: Record<MediaStatus, readonly MediaStatus[]> = {
      UPLOADING: ['READY', 'PROCESSING', 'FAILED', 'DELETED'],
      PROCESSING: ['READY', 'FAILED', 'DELETED'],
      READY: ['DELETED'],
      FAILED: ['DELETED'],
      DELETED: [],
    };

    if (!allowedTransitions[this._status]?.includes(targetStatus)) {
      throw new MediaDomainError(`Illegal status transition from ${this._status} to ${targetStatus}`);
    }

    const timestamp = now ?? new Date();
    this._status = targetStatus;
    this._updatedAt = timestamp;
  }

  public markReady(now?: Date): void {
    this.transitionTo('READY', now);
  }

  public markProcessing(now?: Date): void {
    this.transitionTo('PROCESSING', now);
  }

  public markFailed(now?: Date): void {
    this.transitionTo('FAILED', now);
  }

  public softDelete(now?: Date): void {
    if (this._status === 'DELETED') return;
    const timestamp = now ?? new Date();
    this.transitionTo('DELETED', timestamp);
    this._deletedAt = timestamp;
  }

  public assignOwner(ownerType: string, ownerId: string, now?: Date): void {
    this.ensureNotDeleted();
    if (!ownerType || !ownerId) {
      throw new MediaDomainError('Owner type and ID are required for assignment');
    }
    this._ownerType = ownerType;
    this._ownerId = ownerId;
    this._updatedAt = now ?? new Date();
  }

  public equals(other: Media): boolean {
    if (!(other instanceof Media)) return false;
    return this._id === other.id;
  }

  public toPersistence(): MediaProps {
    return {
      id: this._id,
      fileName: this._fileName,
      storageKey: this._storageKey,
      mimeType: this._mimeType,
      mediaType: this._mediaType,
      fileSize: this._fileSize,
      hash: this._hash,
      status: this._status,
      ownerType: this._ownerType,
      ownerId: this._ownerId,
      uploadedBy: this._uploadedBy,
      createdAt: new Date(this._createdAt.getTime()),
      updatedAt: new Date(this._updatedAt.getTime()),
      deletedAt: this._deletedAt ? new Date(this._deletedAt.getTime()) : null,
    };
  }
}
