import { sendError } from '../utils/response.js';

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  sendError(res, err.message || 'Internal server error', statusCode);
}
