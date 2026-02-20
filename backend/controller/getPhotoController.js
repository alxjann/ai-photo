import { supabase } from '../config/supabase.js';

export const getPhotoController = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('photo')
            .select('id, image_data')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.status(200).json(data);

    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch photo',
            details: error.message
        });
    }
};