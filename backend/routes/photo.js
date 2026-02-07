import express from 'express';
import { getDescription, addDescription } from "../controller/photoController.js";

const router = express.Router();

router.get('/', getDescription);
router.post('/', addDescription);

export default router;