import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { CloudinaryStorageAdapter } from './cloudinary-storage.adapter';
import { SharpImageProcessor } from './sharp-image-processor';

// Check if test credentials are present to decide whether to skip
const testCloudName = process.env.CLOUDINARY_TEST_CLOUD_NAME;
const testApiKey = process.env.CLOUDINARY_TEST_API_KEY;
const testApiSecret = process.env.CLOUDINARY_TEST_API_SECRET;

const hasTestCredentials = !!(testCloudName && testApiKey && testApiSecret);
const describeFunc = hasTestCredentials ? describe : describe.skip;

describe('Integration Credentials Logic Verification', () => {
  test('should skip integration tests if only production variables are defined', () => {
    const checkHasCredentials = (env: Record<string, string | undefined>) => {
      return !!(
        env.CLOUDINARY_TEST_CLOUD_NAME &&
        env.CLOUDINARY_TEST_API_KEY &&
        env.CLOUDINARY_TEST_API_SECRET
      );
    };

    const envWithProdOnly = {
      CLOUDINARY_CLOUD_NAME: 'prod_cloud',
      CLOUDINARY_API_KEY: 'prod_key',
      CLOUDINARY_API_SECRET: 'prod_secret',
    };

    expect(checkHasCredentials(envWithProdOnly)).toBe(false);
  });
});

describeFunc('CloudinaryStorageAdapter Integration Tests', () => {
  let adapter: CloudinaryStorageAdapter;
  const smokeRootPrefix = 'hoangsuphi/test/smoke/';
  const runId = Math.random().toString(36).substring(7);
  const testPrefix = `${smokeRootPrefix}${runId}`;

  beforeAll(async () => {
    adapter = new CloudinaryStorageAdapter({
      cloudName: testCloudName,
      apiKey: testApiKey,
      apiSecret: testApiSecret,
    });

    // The prefix is dedicated to smoke tests. Clear any asset left by a previously interrupted run.
    await cloudinary.api.delete_resources_by_prefix(smokeRootPrefix, {
      resource_type: 'image',
      type: 'upload',
      invalidate: true,
    });
  }, 60_000);

  afterAll(async () => {
    // Safety-net cleanup runs independently from the test body, including after a test timeout/failure.
    await cloudinary.api.delete_resources_by_prefix(smokeRootPrefix, {
      resource_type: 'image',
      type: 'upload',
      invalidate: true,
    });
    const remaining = await cloudinary.api.resources({
      resource_type: 'image',
      type: 'upload',
      prefix: smokeRootPrefix,
      max_results: 100,
    });
    expect(remaining.resources).toHaveLength(0);
  }, 60_000);

  test('uploads, verifies and removes a real sanitized master plus all approved variants', async () => {
    const sourceBuffer = await sharp({
      create: {
        width: 1920,
        height: 1080,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .jpeg()
      .withMetadata({ orientation: 1 })
      .toBuffer();

    const processor = new SharpImageProcessor();
    const sourceMetadata = await processor.extractMetadata(sourceBuffer);
    const outputSpecs = [
      {
        name: 'master',
        width: sourceMetadata.width ?? 1920,
        height: sourceMetadata.height ?? 1080,
        quality: 85,
      },
      { name: 'thumbnail', width: 320, height: 320, quality: 80 },
      { name: 'medium', width: 768, height: 768, quality: 80 },
      { name: 'large', width: 1600, height: 1600, quality: 80 },
    ] as const;

    const attemptedKeys: string[] = [];
    let workflowError: unknown;
    let cleanupError: unknown;

    try {
      for (const spec of outputSpecs) {
        const key = `${testPrefix}/${spec.name}`;
        const output = await processor.resize(sourceBuffer, spec.width, spec.height, spec.quality);
        attemptedKeys.push(key);
        await adapter.upload(key, output.buffer, 'image/webp');

        expect(await adapter.exists(key)).toBe(true);
        const downloadedBuffer = await adapter.download(key);
        const metadata = await sharp(downloadedBuffer).metadata();
        expect(metadata.format).toBe('webp');
        expect((metadata.width ?? 0) <= spec.width).toBe(true);
        expect((metadata.height ?? 0) <= spec.height).toBe(true);
        expect((await adapter.getUrl(key)).startsWith('https://')).toBe(true);
      }
    } catch (error: unknown) {
      workflowError = error;
    }

    try {
      for (const key of attemptedKeys.toReversed()) {
        await adapter.delete(key);
      }
      for (const key of attemptedKeys) {
        expect(await adapter.exists(key)).toBe(false);
      }
    } catch (error: unknown) {
      cleanupError = error;
    }

    if (workflowError !== undefined) {
      throw workflowError;
    }
    if (cleanupError !== undefined) {
      throw cleanupError;
    }
  }, 60_000);
});
