import { afterAll, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { LocalStorageAdapter } from './local-storage.adapter';

describe('LocalStorageAdapter', () => {
  const tmpUploadDir = path.join(process.cwd(), 'public', 'uploads_test_tmp');
  const adapter = new LocalStorageAdapter(tmpUploadDir);
  const testKey = 'test/mountains.jpg';
  const fileContent = Buffer.from('test image data');

  afterAll(async () => {
    // Cleanup temporary test upload directory
    await fs.rm(tmpUploadDir, { recursive: true, force: true });
  });

  test('should successfully write file to local disk and verify existence', async () => {
    // Ensure file doesn't exist
    const initialExists = await adapter.exists(testKey);
    expect(initialExists).toBe(false);

    // Upload
    await adapter.upload(testKey, fileContent, 'image/jpeg');

    // Verify existence
    const postExists = await adapter.exists(testKey);
    expect(postExists).toBe(true);

    // Verify written content
    const safeKey = path.normalize(testKey).replace(/^(\.\.(\/|\\|$))+/, '');
    const actualFilePath = path.join(tmpUploadDir, safeKey);
    const writtenBuffer = await fs.readFile(actualFilePath);
    expect(writtenBuffer.toString()).toBe('test image data');
  });

  test('should successfully generate URL', async () => {
    const url = await adapter.getUrl(testKey);
    expect(url).toBe('/uploads/test/mountains.jpg');
  });

  test('should successfully delete file and verify non-existence', async () => {
    await adapter.delete(testKey);
    const postDeleteExists = await adapter.exists(testKey);
    expect(postDeleteExists).toBe(false);
  });
});
