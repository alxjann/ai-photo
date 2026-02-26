export const deletePhoto = async (user, supabase, photoId) => {
    if (!photoId) throw new Error('Photo ID is required');

    console.log('Deleting photo:', photoId);

    const { data, error } = await supabase
        .from('images')
        .delete()
        .eq('photo_id', photoId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Delete error:', error);
        throw error;
    }

    console.log('Photo deleted successfully:', photoId);
    return data;
};
