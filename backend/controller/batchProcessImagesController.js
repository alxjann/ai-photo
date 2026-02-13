import { batchProcessImages } from '../services/batchProcessImages.js';

export const batchProcessImagesController = async(req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No image files provided' });
        }
        const result = await batchProcessImages(req.files);
        res.status(200).json(result);
    } catch (error) {
        console.error('Batch processing error:', error);
        res.status(500).json({ 
            error: 'Batch processing failed',
            details: error.message 
        });
    }
};