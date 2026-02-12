import express from 'express';
import { generateEmbeddingController } from '../controller/embeddingController.js';

const router = express.Router();


router.post('/embed', generateEmbeddingController);

export default router;