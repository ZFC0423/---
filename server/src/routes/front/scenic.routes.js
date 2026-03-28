import express from 'express';
import { param } from 'express-validator';

import { list, detail } from '../../controllers/front/scenic.controller.js';
import { validateRequest } from '../../middlewares/validate-request.js';

const router = express.Router();

router.get('/list', list);
router.get('/detail/:id', [param('id').isInt({ min: 1 }).withMessage('invalid scenic id'), validateRequest], detail);

export default router;
