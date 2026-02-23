import { generateEmbedding } from './ai/generateEmbedding.js';

export const searchImage = async (user, supabase, query) => {
    if (!query || query.trim() === '') {
        const { data, error } = await supabase
            .from('photo')
            .select('id, thumbnail_data, descriptive, literal, tags, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        console.log(`Returning all ${data?.length || 0} photos`);
        return { results: data, count: data?.length || 0 };
    }

    console.log('Search query:', query);
    const queryEmbedding = await generateEmbedding(query);
    console.log('Query embedding generated (dimension:', queryEmbedding.length, ')');

    const { data: descriptiveResults, error: descError } = await supabase.rpc(
        'match_descriptive_photos',
        {
            query_embedding: queryEmbedding,
            match_threshold: 0.35,
            match_count: 20
        }
    );
    if (descError) throw descError;
    console.log(`Descriptive results: ${descriptiveResults?.length || 0} matches`);

    const { data: literalResults, error: litError } = await supabase.rpc(
        'match_literal_photos',
        {
            query_embedding: queryEmbedding,
            match_threshold: 0.5,
            match_count: 20
        }
    );
    if (litError) throw litError;
    console.log(`Literal results: ${literalResults?.length || 0} matches`);

    const allResults = [...(descriptiveResults || []), ...(literalResults || [])];
    const uniqueResults = Array.from(
        new Map(allResults.map(item => [item.id, item])).values()
    );
    uniqueResults.sort((a, b) => b.similarity - a.similarity);

    console.log(`Total unique results: ${uniqueResults.length}`);

    return { results: uniqueResults, count: uniqueResults.length };
};