import express from 'express';
import { body, param } from 'express-validator';

import {
  create,
  detail,
  list,
  remove,
  update,
  updateStatus
} from '../../controllers/admin/scenic.controller.js';
import { validateRequest } from '../../middlewares/validate-request.js';

const router = express.Router();

const scenicFormRules = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('region').trim().notEmpty().withMessage('region is required'),
  body('categoryId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('categoryId must be a positive integer'),
  body('recommendFlag').optional().isInt({ min: 0, max: 1 }).withMessage('recommendFlag must be 0 or 1'),
  body('status').optional().isInt({ min: 0, max: 1 }).withMessage('status must be 0 or 1'),
  body('hotScore').optional().isInt({ min: 0 }).withMessage('hotScore must be a non-negative integer'),
  validateRequest
];

router.get('/list', list);
router.get('/detail/:id', [param('id').isInt({ min: 1 }).withMessage('invalid scenic id'), validateRequest], detail);
router.post('/create', scenicFormRules, create);
router.put('/update/:id', [param('id').isInt({ min: 1 }).withMessage('invalid scenic id'), ...scenicFormRules], update);
router.delete('/delete/:id', [param('id').isInt({ min: 1 }).withMessage('invalid scenic id'), validateRequest], remove);
router.patch(
  '/status/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('invalid scenic id'),
    body('status').isInt({ min: 0, max: 1 }).withMessage('status must be 0 or 1'),
    validateRequest
  ],
  updateStatus
);

export default router;
