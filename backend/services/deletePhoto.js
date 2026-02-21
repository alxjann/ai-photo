export const deletePhoto = async (user, supabase, id) => {
    if (!id) throw new Error('Photo ID is required');

    console.log('Deleting photo:', id);

    const { data, error } = await supabase
        .from('photo')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Delete error:', error);
        throw error;
    }

    console.log('Photo deleted successfully:', id);
    return data;
};