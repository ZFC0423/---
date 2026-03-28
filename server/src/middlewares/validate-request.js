import { validationResult } from 'express-validator';

export function validateRequest(req, res, next) {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const error = new Error(result.array()[0].msg || 'Invalid request parameters');
    error.statusCode = 400;
    next(error);
    return;
  }

  next();
}
