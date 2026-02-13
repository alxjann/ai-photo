import { supabase } from '../config/supabase.js';

export const getAllPhotosService = async () => {
    console.log('Loading all photos from database...');
    
    // Select all fields including image_data
    // But we won't log the actual data to avoid console flooding

    const { data, error } = await supabase
        .from('photo')
        .select('id, image_data, descriptive, literal, created_at')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};