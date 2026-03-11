export const getAllPhotos = async (user, supabase) => {
    const { data, error } = await supabase
        .from('photo')
        .select('id, device_asset_id, asset_uri, creation_time descriptive, literal, tags, category, manual_description, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};
