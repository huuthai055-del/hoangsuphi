export const MEDIA_CONFIG = {
  maxImageSize: 10 * 1024 * 1024, // 10MB
  maxVideoSize: 50 * 1024 * 1024, // 50MB
  maxDocumentSize: 20 * 1024 * 1024, // 20MB
  allowedMimeTypes: {
    IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
    VIDEO: ['video/mp4', 'video/quicktime', 'video/mpeg'],
    DOCUMENT: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
  },
};
