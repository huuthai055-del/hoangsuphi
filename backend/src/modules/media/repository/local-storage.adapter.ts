import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { StorageUploadError } from '../domain/media-errors';
import type { IMediaStorage } from '../domain/storage.interface';

export class LocalStorageAdapter implements IMediaStorage {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(uploadDir?: string, baseUrl?: string) {
    this.uploadDir = uploadDir ?? path.join(process.cwd(), 'public', 'uploads');
    this.baseUrl = baseUrl ?? '/uploads';
  }

  private getAbsolutePath(key: string): string {
    // Chặn Path Traversal bằng cách chuẩn hóa path và loại bỏ '../' đi lên
    const safeKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.uploadDir, safeKey);
  }

  public async upload(key: string, fileBuffer: Buffer, _mimeType: string): Promise<void> {
    try {
      const filePath = this.getAbsolutePath(key);
      const dirPath = path.dirname(filePath);
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, fileBuffer);
    } catch {
      throw new StorageUploadError('Failed to upload file to local storage');
    }
  }

  public async download(key: string): Promise<Buffer> {
    try {
      const filePath = this.getAbsolutePath(key);
      return await fs.readFile(filePath);
    } catch {
      throw new StorageUploadError('Failed to download file from local storage');
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      const filePath = this.getAbsolutePath(key);
      await fs.rm(filePath, { force: true });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return;
      throw new StorageUploadError('Failed to delete file from local storage');
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const filePath = this.getAbsolutePath(key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  public async getUrl(key: string): Promise<string> {
    const safeKey = key.replace(/\\/g, '/');
    return `${this.baseUrl}/${safeKey}`;
  }
}
