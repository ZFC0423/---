import { sendError } from '../utils/response.js';

export function notFoundHandler(req, res) {
  sendError(res, 'API route not found', 404);
}
