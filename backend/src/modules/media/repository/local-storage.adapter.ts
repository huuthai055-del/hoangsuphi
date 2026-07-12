import type { IMediaStorage } from '../domain/storage.interface';
import { StorageUploadError } from '../domain/media-errors';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

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
    } catch (err) {
      throw new StorageUploadError(`Failed to upload file to local storage: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      const filePath = this.getAbsolutePath(key);
      await fs.rm(filePath, { force: true });
    } catch {
      // Don't crash if delete fails (e.g. file already gone)
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
