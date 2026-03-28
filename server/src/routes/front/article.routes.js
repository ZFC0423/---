import express from 'express';
import { param } from 'express-validator';

import { list, detail } from '../../controllers/front/article.controller.js';
import { validateRequest } from '../../middlewares/validate-request.js';

const router = express.Router();

router.get('/list', list);
router.get('/detail/:id', [param('id').isInt({ min: 1 }).withMessage('invalid article id'), validateRequest], detail);

export default router;
