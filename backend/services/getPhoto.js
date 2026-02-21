import { supabase } from '../config/supabase.js';

export const getPhoto = async (id) => {
    if (!id) throw new Error('Photo ID is required');

    const { data, error } = await supabase
        .from('photo')
        .select('id, image_data')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Get photo error:', error);
        throw error;
    }

    return data;
};