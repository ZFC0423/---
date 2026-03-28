import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadStaticPath = path.resolve(__dirname, '..', '..', env.uploadDir);

function buildFileName(originalName = 'file') {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  return `${Date.now()}-${baseName || 'upload'}${ext || '.jpg'}`;
}

export function ensureUploadDir() {
  if (!fs.existsSync(uploadStaticPath)) {
    fs.mkdirSync(uploadStaticPath, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    ensureUploadDir();
    cb(null, uploadStaticPath);
  },
  filename(req, file, cb) {
    cb(null, buildFileName(file.originalname));
  }
});

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('Only image files are allowed'));
    return;
  }

  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
