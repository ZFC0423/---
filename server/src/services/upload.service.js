import { env } from '../config/env.js';

export function buildUploadResult(file) {
  if (!file) {
    const error = new Error('Please select an image file first');
    error.statusCode = 400;
    throw error;
  }

  return {
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: `${env.uploadUrlPrefix}/${file.filename}`
  };
}
