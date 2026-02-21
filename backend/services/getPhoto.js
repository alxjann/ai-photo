export const getPhoto = async (user, supabase, id) => {
    if (!id) throw new Error('Photo id is required');

    const { data, error } = await supabase
        .from('photo')
        .select('id, image_data')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (error) throw error;

    return data;
};
