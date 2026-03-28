import express from 'express';
import adminRoutes from './admin/index.js';
import frontRoutes from './front/index.js';

const router = express.Router();

router.use('/api/admin', adminRoutes);
router.use('/api/front', frontRoutes);

export default router;
