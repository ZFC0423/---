import express from 'express';
import { body, param } from 'express-validator';

import {
  create,
  list,
  remove,
  update
} from '../../controllers/admin/banner.controller.js';
import { validateRequest } from '../../middlewares/validate-request.js';

const router = express.Router();

const bannerFormRules = [
  body('title').trim().notEmpty().withMessage('title is required'),
  body('imageUrl').trim().notEmpty().withMessage('imageUrl is required'),
  body('sort').optional().isInt({ min: 0 }).withMessage('sort must be a non-negative integer'),
  body('status').optional().isInt({ min: 0, max: 1 }).withMessage('status must be 0 or 1'),
  validateRequest
];

router.get('/list', list);
router.post('/create', bannerFormRules, create);
router.put('/update/:id', [param('id').isInt({ min: 1 }).withMessage('invalid banner id'), ...bannerFormRules], update);
router.delete('/delete/:id', [param('id').isInt({ min: 1 }).withMessage('invalid banner id'), validateRequest], remove);

export default router;
