import express from 'express';
import { body } from 'express-validator';

import { login, profile } from '../../controllers/admin/auth.controller.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { validateRequest } from '../../middlewares/validate-request.js';

const router = express.Router();

router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('username is required'),
    body('password').notEmpty().withMessage('password is required'),
    validateRequest
  ],
  login
);

router.get('/profile', authMiddleware, profile);

export default router;
