import express from 'express';
import authRoutes from './auth.routes.js';
import uploadRoutes from './upload.routes.js';
import scenicRoutes from './scenic.routes.js';
import articleRoutes from './article.routes.js';
import bannerRoutes from './banner.routes.js';
import aiRoutes from './ai.routes.js';
import { authMiddleware } from '../../middlewares/auth.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/upload', authMiddleware, uploadRoutes);
router.use('/scenic', authMiddleware, scenicRoutes);
router.use('/article', authMiddleware, articleRoutes);
router.use('/banner', authMiddleware, bannerRoutes);
router.use('/ai', authMiddleware, aiRoutes);

export default router;
