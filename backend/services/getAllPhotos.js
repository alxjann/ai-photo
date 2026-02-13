import { supabase } from "../config/supabase.js";

export const getAllPhotos = async () => {
    console.log('Loading all photos from database...');
    const { data, error } = await supabase
        .from('photo')
        .select('id, image_data, descriptive, literal, created_at')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return {
        success: true,
        count: data.length,
        results: data,
    };
};