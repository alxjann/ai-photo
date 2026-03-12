import express from 'express';
import { getAllPhotosController, searchPhotosController } from '../controller/photo.controller.js';

const router = express.Router();

router.post('/photos/search', searchPhotosController);
router.get('/photos', getAllPhotosController);

export default router;
