import { sendSuccess } from '../../utils/response.js';
import { buildUploadResult } from '../../services/upload.service.js';

export async function uploadImage(req, res, next) {
  try {
    const result = buildUploadResult(req.file);
    sendSuccess(res, result, 'upload success');
  } catch (error) {
    next(error);
  }
}
