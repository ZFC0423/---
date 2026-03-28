import express from 'express';

import { upload } from '../../config/upload.js';
import { uploadImage } from '../../controllers/admin/upload.controller.js';

const router = express.Router();

router.post('/image', upload.single('file'), uploadImage);

export default router;
