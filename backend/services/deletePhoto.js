export const deletePhoto = async (user, supabase, assetId) => {
    if (!assetId) throw new Error('Photo ID is required');

    console.log('Deleting photo:', assetId);

    const { data, error } = await supabase
        .from('photo')
        .delete()
        .eq('device_asset_id', assetId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Delete error:', error);
        throw error;
    }

    console.log('Photo deleted successfully:', assetId);
    return data;
};
