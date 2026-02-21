import { batchProcessImages } from '../services/batchProcessImages.js';
import { getClientAuthToken } from '../utils/getClientAuthToken.js';

export const batchProcessImagesController = async(req, res) => {
    try {
        const supabase = getClientAuthToken(req, res);

        if (!supabase) return;

        const { data: {user} } = await supabase.auth.getUser();

        if (!req.files || req.files.length === 0) 
            return res.status(400).json({ error: 'No image files provided' });
        
        const { results, errors } = await batchProcessImages(user, req.files);

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