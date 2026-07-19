import sharp from 'sharp';
import type { IImageProcessor, ImageMetadata } from '../domain/image-processor.interface';
import {
  ExifExtractionError,
  ImageProcessingError,
  MediaValidationError,
  UnsupportedMediaTypeError,
} from '../domain/media-errors';

const MAX_IMAGE_PIXELS = 40_000_000;

export class SharpImageProcessor implements IImageProcessor {
  public async extractMetadata(fileBuffer: Buffer): Promise<ImageMetadata> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new ExifExtractionError('Empty file buffer');
    }
    if (fileBuffer.length < 12) {
      throw new ExifExtractionError('File buffer is too short to be a valid image');
    }

    // Detect actual format from magic bytes
    let detectedFormat: 'jpeg' | 'png' | 'webp' | null = null;
    if (fileBuffer[0] === 0xff && fileBuffer[1] === 0xd8 && fileBuffer[2] === 0xff) {
      detectedFormat = 'jpeg';
    } else if (
      fileBuffer.length >= 8 &&
      fileBuffer[0] === 0x89 &&
      fileBuffer[1] === 0x50 &&
      fileBuffer[2] === 0x4e &&
      fileBuffer[3] === 0x47 &&
      fileBuffer[4] === 0x0d &&
      fileBuffer[5] === 0x0a &&
      fileBuffer[6] === 0x1a &&
      fileBuffer[7] === 0x0a
    ) {
      detectedFormat = 'png';
    } else if (
      fileBuffer[0] === 0x52 && // R
      fileBuffer[1] === 0x49 && // I
      fileBuffer[2] === 0x46 && // F
      fileBuffer[3] === 0x46 && // F
      fileBuffer[8] === 0x57 && // W
      fileBuffer[9] === 0x45 && // E
      fileBuffer[10] === 0x42 && // B
      fileBuffer[11] === 0x50 // P
    ) {
      detectedFormat = 'webp';
    } else if (
      fileBuffer.length >= 4 &&
      fileBuffer[0] === 0x47 && // G
      fileBuffer[1] === 0x49 && // I
      fileBuffer[2] === 0x46 && // F
      fileBuffer[3] === 0x38 // 8
    ) {
      throw new UnsupportedMediaTypeError('Unsupported file header signature');
    }

    if (!detectedFormat) {
      throw new UnsupportedMediaTypeError('Unsupported file header signature');
    }

    try {
      // Decode using Sharp with safety configurations
      // pages: -1 ensures all frames are read to correctly populate metadata.pages for animated formats
      const metadata = await sharp(fileBuffer, {
        failOn: 'truncated',
        pages: -1,
        limitInputPixels: MAX_IMAGE_PIXELS,
      }).metadata();

      const width = metadata.autoOrient?.width ?? metadata.width;
      const height = metadata.autoOrient?.height ?? metadata.height;

      if (!width || !height || width <= 0 || height <= 0) {
        throw new ExifExtractionError('Invalid image dimensions');
      }

      // Check pixel and dimension limits
      const totalPixels = width * height;
      if (totalPixels > MAX_IMAGE_PIXELS) {
        throw new MediaValidationError(
          'Image pixel count exceeds the maximum limit of 40,000,000 pixels'
        );
      }
      if (width > 12000 || height > 12000) {
        throw new MediaValidationError(
          'Image dimensions exceed the maximum limit of 12,000 pixels'
        );
      }

      // Reject multi-page or animated files (pages > 1)
      if (metadata.pages && metadata.pages > 1) {
        throw new MediaValidationError('Multi-page or animated images are not allowed');
      }

      // Verify format consistency
      if ((metadata.format as string) !== detectedFormat) {
        throw new UnsupportedMediaTypeError(
          `Format mismatch: signature is ${detectedFormat.toUpperCase()} but decoded format is ${metadata.format}`
        );
      }

      return {
        width,
        height,
        gps: null,
        orientation: metadata.orientation ?? 1,
      };
    } catch (err: unknown) {
      if (
        err instanceof MediaValidationError ||
        err instanceof UnsupportedMediaTypeError ||
        err instanceof ExifExtractionError
      ) {
        throw err;
      }
      if (err instanceof Error && err.message.toLowerCase().includes('pixel limit')) {
        throw new MediaValidationError(
          'Image pixel count exceeds the maximum limit of 40,000,000 pixels'
        );
      }
      throw new ExifExtractionError('Failed to decode image or extract metadata');
    }
  }

  public async resize(
    fileBuffer: Buffer,
    width: number,
    height: number,
    quality?: number
  ): Promise<{ buffer: Buffer; fileSize: number }> {
    // Parameter validation
    if (!Number.isInteger(width) || width <= 0 || !Number.isFinite(width)) {
      throw new ImageProcessingError('Invalid width parameter: must be a positive integer');
    }
    if (!Number.isInteger(height) || height <= 0 || !Number.isFinite(height)) {
      throw new ImageProcessingError('Invalid height parameter: must be a positive integer');
    }
    if (quality !== undefined) {
      if (!Number.isInteger(quality) || quality < 1 || quality > 100 || !Number.isFinite(quality)) {
        throw new ImageProcessingError(
          'Invalid quality parameter: must be an integer between 1 and 100'
        );
      }
    }

    // Underlying input validation via extractMetadata
    try {
      await this.extractMetadata(fileBuffer);
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw new ImageProcessingError(`Invalid image buffer: ${err.message}`);
      }
      throw new ImageProcessingError('Invalid image buffer');
    }

    try {
      // Setup Sharp pipeline: auto-orient, resize fit inside, compress to WebP
      const processedBuffer = await sharp(fileBuffer, {
        failOn: 'truncated',
        limitInputPixels: MAX_IMAGE_PIXELS,
      })
        .rotate()
        .resize({
          width,
          height,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({
          quality: quality ?? 80,
        })
        .toBuffer();

      return {
        buffer: processedBuffer,
        fileSize: processedBuffer.length,
      };
    } catch {
      throw new ImageProcessingError('Failed to process image');
    }
  }
}
