import { describe, expect, test } from 'bun:test';
import { MediaValidationError, UnsupportedMediaTypeError } from '../domain/media-errors';
import { MediaValidationPolicy } from './media-validation.policy';

describe('MediaValidationPolicy - Magic Bytes Validation', () => {
  const jpegHeader = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  const webpHeader = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0x1a, 0x00, 0x00, 0x00]),
    Buffer.from('WEBP'),
  ]);

  test('should pass validation for valid JPEG with image/jpeg MIME', () => {
    expect(() =>
      MediaValidationPolicy.validateImageMagicBytes(jpegHeader, 'image/jpeg')
    ).not.toThrow();
  });

  test('should pass validation for valid PNG with image/png MIME', () => {
    expect(() =>
      MediaValidationPolicy.validateImageMagicBytes(pngHeader, 'image/png')
    ).not.toThrow();
  });

  test('should pass validation for valid WebP with image/webp MIME', () => {
    expect(() =>
      MediaValidationPolicy.validateImageMagicBytes(webpHeader, 'image/webp')
    ).not.toThrow();
  });

  test('should throw UnsupportedMediaTypeError when MIME type mismatch occurs', () => {
    expect(() => MediaValidationPolicy.validateImageMagicBytes(jpegHeader, 'image/png')).toThrow(
      UnsupportedMediaTypeError
    );
    expect(() => MediaValidationPolicy.validateImageMagicBytes(pngHeader, 'image/webp')).toThrow(
      UnsupportedMediaTypeError
    );
    expect(() => MediaValidationPolicy.validateImageMagicBytes(webpHeader, 'image/jpeg')).toThrow(
      UnsupportedMediaTypeError
    );
  });

  test('should throw MediaValidationError for empty or null buffer', () => {
    expect(() =>
      MediaValidationPolicy.validateImageMagicBytes(Buffer.alloc(0), 'image/jpeg')
    ).toThrow(MediaValidationError);
  });

  test('should throw MediaValidationError for truncated / too short buffers', () => {
    expect(() =>
      MediaValidationPolicy.validateImageMagicBytes(Buffer.from([0xff, 0xd8]), 'image/jpeg')
    ).toThrow(MediaValidationError);
  });

  test('should throw MediaValidationError when file header is text/HTML/JSON but claimed as image', () => {
    const textBuffer = Buffer.from('{"hello": "world", "status": "fake"}');
    expect(() => MediaValidationPolicy.validateImageMagicBytes(textBuffer, 'image/jpeg')).toThrow(
      MediaValidationError
    );
    expect(() => MediaValidationPolicy.validateImageMagicBytes(textBuffer, 'image/png')).toThrow(
      MediaValidationError
    );
    expect(() => MediaValidationPolicy.validateImageMagicBytes(textBuffer, 'image/webp')).toThrow(
      MediaValidationError
    );
  });

  test('should throw UnsupportedMediaTypeError for unsupported image signatures (e.g. GIF)', () => {
    const gifHeader = Buffer.from('GIF89a; some padding here and there');
    expect(() => MediaValidationPolicy.validateImageMagicBytes(gifHeader, 'image/gif')).toThrow(
      UnsupportedMediaTypeError
    );
  });

  test('should throw UnsupportedMediaTypeError for image/gif in determineMediaTypeAndLimit', () => {
    expect(() => MediaValidationPolicy.determineMediaTypeAndLimit('image/gif', 100)).toThrow(
      UnsupportedMediaTypeError
    );
  });
});
