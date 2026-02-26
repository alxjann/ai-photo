import express from 'express';
import multer from 'multer';
import { processImageController } from '../controller/processImageController.js';
import { batchProcessImagesController } from '../controller/batchProcessImagesController.js';
import { deletePhotoController } from '../controller/deletePhotoController.js';
import { getPhotoController } from '../controller/getPhotoController.js';

const router = express.Router();

const storage = multer.memoryStorage();
const ALLOWED_MIMETYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'image/tiff', 'image/gif', 'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
    'video/webm', 'video/x-matroska',
];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB to support videos
    fileFilter,
});

router.post('/image', upload.single('image'), processImageController);
router.post('/images/batch', upload.array('images', 50), batchProcessImagesController);
router.delete('/photo/:id', deletePhotoController);
router.get('/photo/:id', getPhotoController);

export default router;