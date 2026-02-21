import { batchProcessImages } from '../services/batchProcessImages.js';

export const batchProcessImagesController = async(req, res) => {
    try {
        if (!req.files || req.files.length === 0) 
            return res.status(400).json({ error: 'No image files provided' });
        
        const { results, errors } = await batchProcessImages(req.files);

        res.status(200).json({
            message: 'Batch processing complete',
            imageCount: req.files.length,
            successful: results.length,
            failed: errors.length,
            results: results,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Batch processing error:', error);
        res.status(500).json({ 
            error: 'Batch processing failed',
            details: error.message 
        });
    }
};