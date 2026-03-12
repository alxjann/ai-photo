import express from 'express';
import multer from 'multer';
import {
    batchProcessPhotosController,
    deletePhotoController,
    getPhotoController,
    processPhotoController,
    reprocessPhotoController,
    updatePhotoDescriptionsController,
} from '../controller/photo.controller.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
    storage, 
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/photo', upload.single('image'), processPhotoController);
router.post('/photos/batch', upload.array('images', 50), batchProcessPhotosController);
router.delete('/photo/:id', deletePhotoController);
router.get('/photo/:id', getPhotoController);
router.patch('/photo/:id/descriptions', updatePhotoDescriptionsController);
router.post('/photo/:id/reprocess', upload.single('image'), reprocessPhotoController);

export default router;
