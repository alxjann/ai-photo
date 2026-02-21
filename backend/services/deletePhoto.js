import { supabase } from '../config/supabase.js';

export const deletePhoto = async (id) => {
    if (!id) throw new Error('Photo ID is required');

    console.log('Deleting photo:', id);

    const { data, error } = await supabase
        .from('photo')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Delete error:', error);
        throw error;
    }

    console.log('Photo deleted successfully:', id);
    return data;
};