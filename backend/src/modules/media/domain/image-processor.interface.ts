export interface ImageMetadata {
  width?: number;
  height?: number;
  cameraMake?: string;
  cameraModel?: string;
  creationDate?: Date;
  gps?: {
    latitude: number;
    longitude: number;
  } | null;
  orientation?: number;
}

export interface IImageProcessor {
  extractMetadata(fileBuffer: Buffer): Promise<ImageMetadata>;
  resize(
    fileBuffer: Buffer,
    width: number,
    height: number,
    quality?: number
  ): Promise<{ buffer: Buffer; fileSize: number }>;
}
