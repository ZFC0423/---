import express from 'express';
import { body } from 'express-validator';

import {
  chat,
  discovery,
  discoveryQuery,
  intent,
  knowledge,
  recommendQuestions,
  routePlanGenerate,
  routePlanNarrative,
  routePlanRevise,
  tripPlan
} from '../../controllers/front/ai.controller.js';
import { validateRequest } from '../../middlewares/validate-request.js';

const router = express.Router();
const allowedInterests = ['natural', 'red_culture', 'hakka_culture', 'heritage', 'food', 'family', 'photography'];

function optionalNullableStringArray(field) {
  return body(field)
    .optional({ nullable: true })
    .custom((value) => value === null || (Array.isArray(value) && value.every((item) => typeof item === 'string')))
      .withMessage(`${field} must be a string array or null`);
}

function createRequirePlainObjectField(field) {
  return function requirePlainObjectField(req, res, next) {
    const value = req.body?.[field];

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      res.status(400).json({
        code: 400,
        message: `${field} must be an object`,
        data: null
      });
      return;
    }

    next();
  };
}

router.get('/recommend-questions', recommendQuestions);
router.post(
  '/discovery/query',
  [
    body('user_query')
      .isString()
      .withMessage('user_query must be a string')
      .trim()
      .notEmpty()
      .withMessage('user_query is required')
      .isLength({ max: 500 })
      .withMessage('user_query is too long'),
    body('previous_public_result')
      .optional({ nullable: true })
      .custom((value) => value === null || (typeof value === 'object' && !Array.isArray(value)))
      .withMessage('previous_public_result must be an object or null'),
    body('decision_context')
      .optional({ nullable: true })
      .custom((value) => value === null || (typeof value === 'object' && !Array.isArray(value)))
      .withMessage('decision_context must be an object or null'),
    body('action')
      .optional({ nullable: true })
      .custom((value) => value === null || (typeof value === 'object' && !Array.isArray(value)))
      .withMessage('action must be an object or null'),
    body('priorState')
      .optional({ nullable: true })
      .custom((value) => value === null || (typeof value === 'object' && !Array.isArray(value)))
      .withMessage('priorState must be an object or null'),
    validateRequest
  ],
  discoveryQuery
);
router.post(
  '/discovery',
  [
    body('task_type')
      .optional()
      .isString()
      .withMessage('task_type must be a string'),
    body('constraints')
      .optional({ nullable: true })
      .custom((value) => value === null || (typeof value === 'object' && !Array.isArray(value)))
      .withMessage('constraints must be an object or null'),
    body('previous_public_result')
      .optional({ nullable: true })
      .custom((value) => value === null || (typeof value === 'object' && !Array.isArray(value)))
      .withMessage('previous_public_result must be an object or null'),
    body('decision_context')
      .optional({ nullable: true })
      .custom((value) => value === null || (typeof value === 'object' && !Array.isArray(value)))
      .withMessage('decision_context must be an object or null'),
    body('action')
      .optional({ nullable: true })
      .custom((value) => value === null || (typeof value === 'object' && !Array.isArray(value)))
      .withMessage('action must be an object or null'),
    validateRequest
  ],
  discovery
);
router.post(
  '/intent',
  [
    body('input')
      .isString()
      .withMessage('input must be a string')
      .trim()
      .notEmpty()
      .withMessage('input is required')
      .isLength({ max: 500 })
      .withMessage('input is too long'),
    body('priorState')
      .optional({ nullable: true })
      .custom((value) => value === null || (typeof value === 'object' && !Array.isArray(value)))
      .withMessage('priorState must be an object or null'),
    validateRequest
  ],
  intent
);
router.post(
  '/knowledge',
  [
    body('routerResult')
      .custom((value) => value && typeof value === 'object' && !Array.isArray(value))
      .withMessage('routerResult must be an object'),
    body('routerResult.task_type')
      .equals('guide_understand')
      .withMessage('routerResult.task_type must be guide_understand'),
    body('routerResult.task_confidence')
      .isFloat({ min: 0, max: 1 })
      .withMessage('routerResult.task_confidence must be a number between 0 and 1'),
    body('routerResult.clarification_needed')
      .custom((value) => value === false)
      .withMessage('routerResult.clarification_needed must be false'),
    body('routerResult.clarification_reason')
      .custom((value) => value === null)
      .withMessage('routerResult.clarification_reason must be null'),
    body('routerResult.missing_required_fields')
      .isArray({ max: 0 })
      .withMessage('routerResult.missing_required_fields must be an empty array'),
    body('routerResult.clarification_questions')
      .isArray({ max: 0 })
      .withMessage('routerResult.clarification_questions must be an empty array'),
    body('routerResult.next_agent')
      .equals('ai_chat')
      .withMessage('routerResult.next_agent must be ai_chat'),
    body('routerResult.constraints')
      .custom((value) => value && typeof value === 'object' && !Array.isArray(value))
      .withMessage('routerResult.constraints must be an object'),
    body('routerResult.constraints.user_query')
      .isString()
      .withMessage('routerResult.constraints.user_query must be a string')
      .trim()
      .notEmpty()
      .withMessage('routerResult.constraints.user_query is required')
      .isLength({ max: 500 })
      .withMessage('routerResult.constraints.user_query is too long'),
    optionalNullableStringArray('routerResult.constraints.subject_entities'),
    optionalNullableStringArray('routerResult.constraints.theme_preferences'),
    optionalNullableStringArray('routerResult.constraints.region_hints'),
    optionalNullableStringArray('routerResult.constraints.scenic_hints'),
    optionalNullableStringArray('routerResult.constraints.hard_avoidances'),
    optionalNullableStringArray('routerResult.constraints.companions'),
    validateRequest
  ],
  knowledge
);
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
router.post(
  '/route-plan/generate',
  [
    createRequirePlainObjectField('routerResult')
  ],
  routePlanGenerate
);
router.post(
  '/route-plan/narrative',
  [
    createRequirePlainObjectField('public_plan')
  ],
  routePlanNarrative
);
router.post(
  '/route-plan/revise',
  [
    createRequirePlainObjectField('previous_public_plan'),
    createRequirePlainObjectField('previous_plan_context'),
    createRequirePlainObjectField('action')
  ],
  routePlanRevise
);

export default router;
