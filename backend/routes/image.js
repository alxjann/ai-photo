import express from 'express';
import multer from 'multer';
import { processImageController } from '../controller/processImageController.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });


router.post('/image', upload.single('image'), processImageController);

export default router;