import { generateEmbedding } from './ai/generateEmbedding.js';

export const searchImage = async (user, supabase, query) => {
    if (!query || query.trim() === '') {
        const { data, error } = await supabase
            .from('photo')
            .select('id, descriptive, literal, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { results: data, count: data?.length || 0 };
    }

    const queryEmbedding = await generateEmbedding(query);

    const { data: descriptiveResults, error: descError } = await supabase.rpc(
        'match_descriptive_photos',
        {
            query_embedding: queryEmbedding,
            match_threshold: 0.20,
            match_count: 20
        }
    );
    if (descError) throw descError;

    const { data: literalResults, error: litError } = await supabase.rpc(
        'match_literal_photos',
        {
            query_embedding: queryEmbedding,
            match_threshold: 0.35,
            match_count: 20
        }
    );
    if (litError) throw litError;

    const scoreMap = new Map();
    for (const item of [...(descriptiveResults || []), ...(literalResults || [])]) {
        const existing = scoreMap.get(item.id);
        if (!existing || item.similarity > existing.similarity) {
            scoreMap.set(item.id, item);
        }
    }

    const uniqueResults = Array.from(scoreMap.values());
    uniqueResults.sort((a, b) => b.similarity - a.similarity);

    return { results: uniqueResults, count: uniqueResults.length };
};