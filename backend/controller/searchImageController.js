import { searchImage } from '../services/searchImage.js';

export const searchImagesController = async (req, res) => {
    try {
        const { query } = req.body;
        const result = await searchImage(query);
        res.status(200).json(result);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            error: 'Search failed',
            details: error.message 
        });
    }
};