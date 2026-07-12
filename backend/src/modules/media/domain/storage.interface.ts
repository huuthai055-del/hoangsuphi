export interface IMediaStorage {
  upload(key: string, fileBuffer: Buffer, mimeType: string): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): Promise<string>;
}
