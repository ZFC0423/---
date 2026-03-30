import express from 'express';
import { body } from 'express-validator';

import { chat, recommendQuestions, tripPlan } from '../../controllers/front/ai.controller.js';
import { validateRequest } from '../../middlewares/validate-request.js';

const router = express.Router();
const allowedInterests = ['natural', 'red_culture', 'hakka_culture', 'heritage', 'food', 'family', 'photography'];

router.get('/recommend-questions', recommendQuestions);
router.post(
  '/chat',
  [
    body('question')
      .isString()
      .withMessage('question must be a string')
      .trim()
      .notEmpty()
      .withMessage('question is required')
      .isLength({ max: 200 })
      .withMessage('question is too long'),
    validateRequest
  ],
  chat
);
router.post(
  '/trip-plan',
  [
    body('days')
      .isInt({ min: 1, max: 5 })
      .withMessage('days must be an integer between 1 and 5'),
    body('interests')
      .isArray({ min: 1 })
      .withMessage('interests must be a non-empty array'),
    body('interests.*')
      .isIn(allowedInterests)
      .withMessage('interests contains an unsupported value'),
    body('pace')
      .isIn(['relaxed', 'normal', 'compact'])
      .withMessage('pace is invalid'),
    body('transport')
      .isIn(['public_transport', 'self_drive'])
      .withMessage('transport is invalid'),
    body('notes')
      .optional({ nullable: true })
      .isString()
      .withMessage('notes must be a string')
      .isLength({ max: 300 })
      .withMessage('notes is too long'),
    validateRequest
  ],
  tripPlan
);

export default router;
