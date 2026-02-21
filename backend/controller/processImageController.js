import { processImage } from '../services/processImage.js';
import { getClientAuthToken } from '../utils/getClientAuthToken.js';

export const processImageController = async (req, res) => {
    try {
        const supabase = getClientAuthToken(req, res);

        if (!supabase) return;

        const { data: { user } } = await supabase.auth.getUser();

        if (!user)
            return res.status(401).json({ error: 'Unauthorized' });

        if (!req.file)
            return res.status(400).json({ error: 'No image file provided' });

        const manualDescription = req.body.manualDescription || null;
        
        const result = await processImage(user, supabase, req.file.buffer, manualDescription);
        
        res.status(200).json({
            message: 'image processed successfully',
            photo: result
        });

    } catch (error) {
        console.error('error:', error);
        res.status(500).json({ error: 'failed to process image' });
    }
};