import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAdminToken(admin) {
  return jwt.sign(
    {
      adminId: admin.id,
      username: admin.username,
      role: admin.role
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn
    }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
