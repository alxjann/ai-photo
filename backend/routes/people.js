import express from 'express';
import multer from 'multer';
import { registerPersonController } from '../controller/registerPersonController.js';
import { getPeopleController } from '../controller/getPeopleController.js';
import { deletePersonController } from '../controller/deletePersonController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/person', upload.single('image'), registerPersonController);
router.get('/people', getPeopleController);
router.delete('/person/:id', deletePersonController);

export default router;