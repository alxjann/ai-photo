import express from 'express';
import { searchImagesController } from '../controller/searchImageController.js';
import { getAllPhotosController } from '../controller/getAllPhotosController.js';

const router = express.Router();

router.post('/search', searchImagesController);
router.get('/photos', getAllPhotosController);

export default router;