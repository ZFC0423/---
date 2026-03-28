import express from 'express';
import { body, param } from 'express-validator';

import {
  create,
  detail,
  list,
  remove,
  update,
  updateStatus
} from '../../controllers/admin/article.controller.js';
import { validateRequest } from '../../middlewares/validate-request.js';

const router = express.Router();

const articleFormRules = [
  body('title').trim().notEmpty().withMessage('title is required'),
  body('categoryId').isInt({ min: 1 }).withMessage('categoryId is required'),
  body('recommendFlag').optional().isInt({ min: 0, max: 1 }).withMessage('recommendFlag must be 0 or 1'),
  body('status').optional().isInt({ min: 0, max: 1 }).withMessage('status must be 0 or 1'),
  validateRequest
];

router.get('/list', list);
router.get('/detail/:id', [param('id').isInt({ min: 1 }).withMessage('invalid article id'), validateRequest], detail);
router.post('/create', articleFormRules, create);
router.put('/update/:id', [param('id').isInt({ min: 1 }).withMessage('invalid article id'), ...articleFormRules], update);
router.delete('/delete/:id', [param('id').isInt({ min: 1 }).withMessage('invalid article id'), validateRequest], remove);
router.patch(
  '/status/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('invalid article id'),
    body('status').isInt({ min: 0, max: 1 }).withMessage('status must be 0 or 1'),
    validateRequest
  ],
  updateStatus
);

export default router;
