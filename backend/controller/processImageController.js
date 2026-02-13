import { processImage } from '../services/processImage.js';

export const processImageController = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'no image file provided' });
        }

        await processImage(req.file.buffer);

        res.status(200).json({
            message: 'image processed successfully'
        });
    } catch (error) {
        console.error('error:', error);
        res.status(500).json({ error: 'fai;ed to process image' });
    }
};