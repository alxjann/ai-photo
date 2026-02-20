import { processImage } from '../services/processImage.js';

export const processImageController = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const manualDescription = req.body.manualDescription || null;
        
        const result = await processImage(req.file.buffer, manualDescription);
        
        res.status(200).json({
            message: 'Image processed successfully',
            ...result
        });

    } catch (error) {
        console.error('error:', error);
        
        const statusCode = error.message.includes('Duplicate') ? 409 : 500;
        
        res.status(statusCode).json({ 
            error: error.message,
            details: error.message
        });
    }
};