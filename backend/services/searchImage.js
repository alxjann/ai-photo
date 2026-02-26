import { textEmbedding } from './ai/textEmbedding.js';

export const searchImage = async (user, supabase, query) => {
    if (!query || query.trim() === '') {
        // No query, return all images WITH image_data
        const { data, error } = await supabase
            .from('images')
            .select('id, photo_id, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        console.log(`Returning all ${data?.length || 0} photos`);
        return data;
    }

    console.log('Search query:', query);
    // Generate embedding for the search query
    const queryEmbedding = await textEmbedding(query);
    console.log('Query embedding generated (dimension:', queryEmbedding.length, ')');
    
    const { data, error } = await supabase.rpc(
        'match_photos', // New simplified SQL function
        {
            query_embedding: queryEmbedding,
            match_threshold: 0.2, // CLIP threshold is usually lower than standard text models
            match_count: 40,
            p_user_id: user.id // Pass user ID to ensure they only see their own photos
        }
    );

    if (error) throw error;

    console.log(`Found ${data?.length || 0} matches using multimodal search`);
    return data;
}
