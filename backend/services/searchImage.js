import { generateEmbedding } from './ai/generateEmbedding.js';

export const searchImage = async (user, supabase, query) => {
    if (!query || query.trim() === '') {
        // No query, return all images WITH image_data
        const { data, error } = await supabase
            .from('photo')
            .select('id, thumbnail_data, descriptive, literal, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        console.log(`Returning all ${data?.length || 0} photos`);
        return data;
    }

    console.log('Search query:', query);
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);
    console.log('Query embedding generated (dimension:', queryEmbedding.length, ')');
    
    // Search descriptive embeddings
    const { data: descriptiveResults, error: descError } = await supabase.rpc(
        'match_descriptive_photos',
        {
            query_embedding: queryEmbedding,
            match_threshold: 0.3,
            match_count: 20
        }
    );
    if (descError) throw descError;

    console.log(`Descriptive results: ${descriptiveResults?.length || 0} matches`);

    // Search literal embeddings
    const { data: literalResults, error: litError } = await supabase.rpc(
        'match_literal_photos',
        {
            query_embedding: queryEmbedding,
            match_threshold: 0.3,
            match_count: 20
        }
    );
    if (litError) throw litError;
    console.log(`Literal results: ${literalResults?.length || 0} matches`);

    // Combine and deduplicate results
    const allResults = [...(descriptiveResults || []), ...(literalResults || [])];
    const uniqueResults = Array.from(
        new Map(allResults.map(item => [item.id, item])).values()
    );
    uniqueResults.sort((a, b) => b.similarity - a.similarity);

    console.log(`Total unique results: ${uniqueResults.length}`);

    return uniqueResults;
}