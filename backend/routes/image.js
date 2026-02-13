import express from 'express';
import multer from 'multer';
import { processImageController } from '../controller/processImageController.js';
import { batchProcessImagesController } from '../controller/batchProcessImagesController.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
    storage, 
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB per file
});

// Single image upload
router.post('/image', upload.single('image'), processImageController);

// Batch upload - up to 10 images
router.post('/images/batch', upload.array('images', 10), batchProcessImagesController);

export default router;