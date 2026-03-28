import express from 'express';
import homeRoutes from './home.routes.js';
import scenicRoutes from './scenic.routes.js';
import articleRoutes from './article.routes.js';

const router = express.Router();

router.use('/home', homeRoutes);
router.use('/scenic', scenicRoutes);
router.use('/article', articleRoutes);

export default router;
