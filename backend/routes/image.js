import express from 'express';
import multer from 'multer';
import { processImageController } from '../controller/processImageController.js';
import { batchProcessImagesController } from '../controller/batchProcessImagesController.js';
import { deletePhotoController } from '../controller/deletePhotoController.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
    storage, 
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/image', upload.single('image'), processImageController);
router.post('/images/batch', upload.array('images', 10), batchProcessImagesController);
router.delete('/photo/:id', deletePhotoController);

export default router;