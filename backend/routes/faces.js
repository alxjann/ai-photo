import express from 'express';
import multer from 'multer';
import { registerFaceController, getKnownFacesController, deleteFaceController } from '../controller/faceController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/faces', getKnownFacesController);
router.post('/faces/register', upload.single('image'), registerFaceController);
router.delete('/faces/:id', deleteFaceController);

export default router;