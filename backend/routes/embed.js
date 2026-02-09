import express from 'express';
import { generateEmbedding } from '../services/generateEmbedding.js';

const router = express.Router();


router.post('/embed', generateEmbedding);

export default router;