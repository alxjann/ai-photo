import { processImage } from '../services/processImage.js';

export const processImageController = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        await processImage(req.file.buffer);

        res.status(200).json({
            message: 'Image processed successfully'
        });
    } catch (error) {
        console.error('Process image error:', error);
        res.status(500).json({ error: 'Failed to process image' });
    }
};