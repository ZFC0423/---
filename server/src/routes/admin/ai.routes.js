import express from 'express';
import { body, query } from 'express-validator';

import {
  getChatLogs,
  getCopywritingLogs,
  getTripLogs,
  scenicCopywriting
} from '../../controllers/admin/ai.controller.js';
import { validateRequest } from '../../middlewares/validate-request.js';

const router = express.Router();

const paginationValidators = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('pageSize must be an integer between 1 and 20'),
  validateRequest
];

router.post(
  '/copywriting/scenic',
  [
    body('targetId')
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage('targetId must be a positive integer'),
    body('name')
      .isString()
      .withMessage('name must be a string')
      .trim()
      .notEmpty()
      .withMessage('name is required')
      .isLength({ max: 100 })
      .withMessage('name is too long'),
    body('region')
      .optional({ nullable: true })
      .isString()
      .withMessage('region must be a string')
      .trim()
      .isLength({ max: 100 })
      .withMessage('region is too long'),
    body('tags')
      .optional({ nullable: true })
      .isArray({ max: 8 })
      .withMessage('tags must be an array'),
    body('tags.*')
      .optional()
      .isString()
      .withMessage('each tag must be a string')
      .isLength({ max: 30 })
      .withMessage('tag is too long'),
    body('notes')
      .optional({ nullable: true })
      .isString()
      .withMessage('notes must be a string')
      .trim()
      .isLength({ max: 200 })
      .withMessage('notes is too long'),
    validateRequest
  ],
  scenicCopywriting
);

router.get('/logs/chat', paginationValidators, getChatLogs);
router.get('/logs/trip', paginationValidators, getTripLogs);
router.get('/logs/copywriting', paginationValidators, getCopywritingLogs);

export default router;
