export const getAllPhotos = async (user, supabase) => {
    console.log('Loading all photos from database...');
    const { data, error } = await supabase
        .from('photo')
        .select('id, thumbnail_data, descriptive, literal, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return data;
};