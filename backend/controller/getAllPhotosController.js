import { supabase } from '../config/supabase.js';

export const getAllPhotosController = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('photo')
            .select('id, thumbnail_data, descriptive, literal, tags, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({
            success: true,
            count: data?.length || 0,
            results: data || [],
        });

    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch photos',
            details: error.message 
        });
    }
};