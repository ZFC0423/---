import { verifyToken } from '../utils/jwt.js';

export function authMiddleware(req, res, next) {
  try {
    const authorization = req.headers.authorization || '';

    if (!authorization.startsWith('Bearer ')) {
      const error = new Error('Missing or invalid token');
      error.statusCode = 401;
      throw error;
    }

    const token = authorization.replace('Bearer ', '').trim();
    req.auth = verifyToken(token);

    next();
  } catch (error) {
    error.statusCode = 401;
    next(error);
  }
}
