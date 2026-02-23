import { searchImage } from '../services/searchImage.js';
import { getClientAuthToken } from '../utils/getClientAuthToken.js';

export const searchImagesController = async (req, res) => {
    try {
        const supabase = getClientAuthToken(req, res);
        if (!supabase) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const { query } = req.body;
        const { results, count } = await searchImage(user, supabase, query);

        res.status(200).json({ results, count });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            error: 'Search failed',
            details: error.message
        });
    }
};