import { searchImage } from '../services/searchImage.js';
import { getClientAuthToken } from '../utils/getClientAuthToken.js';

export const searchImagesController = async (req, res) => {
    try {
        const supabase = getClientAuthToken(req, res);

        if (!supabase) return;

        const { data: {user} } = await supabase.auth.getUser();

        const { query } = req.body;
        const result = await searchImage(user, supabase, query);
        res.status(200).json({
            count: result.length,
            result
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            error: 'Search failed',
            details: error.message 
        });
    }
};