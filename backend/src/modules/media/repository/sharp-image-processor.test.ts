import { beforeAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import sharp from 'sharp';
import {
  ExifExtractionError,
  ImageProcessingError,
  MediaValidationError,
  UnsupportedMediaTypeError,
} from '../domain/media-errors';
import { SharpImageProcessor } from './sharp-image-processor';

describe('SharpImageProcessor Integration Tests', () => {
  let jpegBuffer: Buffer;
  let pngBuffer: Buffer;
  let webpBuffer: Buffer;
  let exifJpegBuffer: Buffer;
  let orientedJpegBuffer: Buffer;
  const processor = new SharpImageProcessor();

  beforeAll(async () => {
    // Generate valid small images in memory for testing
    jpegBuffer = await sharp({
      create: {
        width: 32,
        height: 24,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();

    pngBuffer = await sharp({
      create: {
        width: 40,
        height: 30,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();

    webpBuffer = await sharp({
      create: {
        width: 48,
        height: 36,
        channels: 3,
        background: { r: 0, g: 0, b: 255 },
      },
    })
      .webp()
      .toBuffer();

    // Create a JPEG containing EXIF metadata using Sharp in test setup
    exifJpegBuffer = await sharp({
      create: {
        width: 60,
        height: 45,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .jpeg()
      .withMetadata({
        exif: {
          IFD0: {
            Artist: 'Antigravity Test Artist',
            Make: 'Nikon',
            Model: 'D850',
          },
          GPSInfo: {
            GPSLatitudeRef: 'N',
            GPSLatitude: '22/1 45/1 0/1',
            GPSLongitudeRef: 'E',
            GPSLongitude: '104/1 45/1 0/1',
          },
        } as any,
      })
      .toBuffer();

    orientedJpegBuffer = await sharp({
      create: {
        width: 60,
        height: 45,
        channels: 3,
        background: { r: 20, g: 40, b: 60 },
      },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
  });

  describe('Magic Bytes Validation & Decode Check', () => {
    test('should extract metadata correctly from valid JPEG, PNG and WebP', async () => {
      const jpegMeta = await processor.extractMetadata(jpegBuffer);
      expect(jpegMeta.width).toBe(32);
      expect(jpegMeta.height).toBe(24);

      const pngMeta = await processor.extractMetadata(pngBuffer);
      expect(pngMeta.width).toBe(40);
      expect(pngMeta.height).toBe(30);

      const webpMeta = await processor.extractMetadata(webpBuffer);
      expect(webpMeta.width).toBe(48);
      expect(webpMeta.height).toBe(36);
    });

    test('should reject empty or null buffers', async () => {
      await expect(processor.extractMetadata(Buffer.alloc(0))).rejects.toThrow(ExifExtractionError);
    });

    test('should reject truncated / too short buffers', async () => {
      await expect(processor.extractMetadata(Buffer.from([0xff, 0xd8]))).rejects.toThrow(
        ExifExtractionError
      );
    });

    test('should reject unsupported magic bytes signatures (e.g. text or GIF)', async () => {
      const textBuffer = Buffer.from('plain text file content');
      await expect(processor.extractMetadata(textBuffer)).rejects.toThrow(
        UnsupportedMediaTypeError
      );

      const staticGifHex =
        '47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b';
      const gifHeader = Buffer.from(staticGifHex, 'hex');
      await expect(processor.extractMetadata(gifHeader)).rejects.toThrow(UnsupportedMediaTypeError);
    });

    test('should reject valid magic bytes signature but corrupted body payload', async () => {
      const fakeJpeg = Buffer.alloc(100);
      fakeJpeg[0] = 0xff;
      fakeJpeg[1] = 0xd8;
      fakeJpeg[2] = 0xff;
      await expect(processor.extractMetadata(fakeJpeg)).rejects.toThrow(ExifExtractionError);
    });
  });

  describe('Resource Limits Validation', () => {
    test('should reject image exceeding pixel count limits (40,000,000)', async () => {
      const hugeImg = await sharp({
        create: {
          width: 7000,
          height: 6000,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .jpeg({ quality: 1 })
        .toBuffer();
      await expect(processor.extractMetadata(hugeImg)).rejects.toThrow(MediaValidationError);
    });

    test('should reject image exceeding width limit (12,000)', async () => {
      const wideImg = await sharp({
        create: {
          width: 12001,
          height: 10,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();
      await expect(processor.extractMetadata(wideImg)).rejects.toThrow(MediaValidationError);
    });

    test('should reject image exceeding height limit (12,000)', async () => {
      const tallImg = await sharp({
        create: {
          width: 10,
          height: 12001,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();
      await expect(processor.extractMetadata(tallImg)).rejects.toThrow(MediaValidationError);
    });

    test('should reject animated / multi-page GIF and throw UnsupportedMediaTypeError', async () => {
      const animatedGifHex =
        '47494638396101000100800000000000ffffff21f904090a0000002c00000000010001000002024c010021f904090a0000002c00000000010001000002024c01003b';
      const animatedGifBuf = Buffer.from(animatedGifHex, 'hex');
      await expect(processor.extractMetadata(animatedGifBuf)).rejects.toThrow(
        UnsupportedMediaTypeError
      );
    });
  });

  describe('Resize and WebP compression pipeline', () => {
    test('should successfully resize PNG and WebP, converting both to valid WebP format', async () => {
      const resized = await processor.resize(pngBuffer, 20, 15);
      expect(resized.buffer).toBeInstanceOf(Buffer);
      expect(resized.fileSize).toBe(resized.buffer.length);

      // Verify output header is WebP
      expect(resized.buffer.subarray(0, 4).toString('binary')).toBe('RIFF');
      expect(resized.buffer.subarray(8, 12).toString('binary')).toBe('WEBP');

      // Decode validation
      const decMeta = await sharp(resized.buffer).metadata();
      expect(decMeta.format).toBe('webp');
      expect(decMeta.width).toBe(20);
      expect(decMeta.height).toBe(15);
    });

    test('should maintain aspect ratio and respect fit=inside (no stretching)', async () => {
      // Input: 32x24 (aspect ratio 4:3)
      // Target: 100x100
      // Aspect ratio inside 100x100 should yield: 100x75 (if target was 100x100, wait, inside preserves aspect ratio: width=32->100, height=24->75)
      // But we have withoutEnlargement: true, so it should not scale up! It should remain 32x24!
      const resized = await processor.resize(jpegBuffer, 100, 100);
      const decMeta = await sharp(resized.buffer).metadata();
      expect(decMeta.width).toBe(32);
      expect(decMeta.height).toBe(24);
    });

    test('should scale down large images but preserve aspect ratio', async () => {
      // Let's generate a larger image: 200x100 (2:1)
      const largeImg = await sharp({
        create: {
          width: 200,
          height: 100,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      // Resize target: 50x50. Fits inside should yield: 50x25
      const resized = await processor.resize(largeImg, 50, 50);
      const decMeta = await sharp(resized.buffer).metadata();
      expect(decMeta.width).toBe(50);
      expect(decMeta.height).toBe(25);
    });

    test('should reject invalid size parameters', async () => {
      await expect(processor.resize(jpegBuffer, 0, 10)).rejects.toThrow(ImageProcessingError);
      await expect(processor.resize(jpegBuffer, 10, -5)).rejects.toThrow(ImageProcessingError);
      await expect(processor.resize(jpegBuffer, Number.NaN, 10)).rejects.toThrow(
        ImageProcessingError
      );
      await expect(processor.resize(jpegBuffer, 10, Number.POSITIVE_INFINITY)).rejects.toThrow(
        ImageProcessingError
      );
    });

    test('should reject invalid quality parameters', async () => {
      await expect(processor.resize(jpegBuffer, 10, 10, 0)).rejects.toThrow(ImageProcessingError);
      await expect(processor.resize(jpegBuffer, 10, 10, 101)).rejects.toThrow(ImageProcessingError);
    });
  });

  describe('EXIF & GPS Stripping Security', () => {
    test('should report auto-oriented dimensions and preserve them in sanitized output', async () => {
      const inputMeta = await processor.extractMetadata(orientedJpegBuffer);
      expect(inputMeta.width).toBe(45);
      expect(inputMeta.height).toBe(60);

      const processed = await processor.resize(
        orientedJpegBuffer,
        inputMeta.width ?? 1,
        inputMeta.height ?? 1,
        85
      );
      const outputMeta = await sharp(processed.buffer).metadata();
      expect(outputMeta.width).toBe(45);
      expect(outputMeta.height).toBe(60);
      expect(outputMeta.orientation).toBeUndefined();
    });

    test('should strip all EXIF, GPS and other camera metadata from output', async () => {
      // Verify our input indeed contains EXIF (optional check)
      const inputMeta = await sharp(exifJpegBuffer).metadata();
      expect(inputMeta.exif).toBeDefined();

      // Process it via SharpImageProcessor
      const processed = await processor.resize(exifJpegBuffer, 30, 20);

      // Verify processed image
      const outputMeta = await sharp(processed.buffer).metadata();
      expect(outputMeta.exif).toBeUndefined();
      expect(outputMeta.xmp).toBeUndefined();
      expect(outputMeta.iptc).toBeUndefined();
    });

    test('production code does not use withMetadata or keepMetadata', () => {
      const path = require('node:path');
      const sourcePath = path.join(import.meta.dir, 'sharp-image-processor.ts');
      const code = fs.readFileSync(sourcePath, 'utf-8');
      expect(code.includes('.withMetadata')).toBe(false);
      expect(code.includes('.keepMetadata')).toBe(false);
    });
  });

  describe('Sanitized Master Capability', () => {
    test('should generate a sanitized master WebP at quality 85', async () => {
      // Process sanitized master by calling resize with quality=85 and large dimensions (without upscale)
      const master = await processor.resize(exifJpegBuffer, 12000, 12000, 85);
      expect(master.buffer.subarray(0, 4).toString('binary')).toBe('RIFF');
      expect(master.buffer.subarray(8, 12).toString('binary')).toBe('WEBP');

      const meta = await sharp(master.buffer).metadata();
      expect(meta.exif).toBeUndefined();
      expect(meta.width).toBe(60); // did not upscale from 60x45
      expect(meta.height).toBe(45);
    });
  });
});
