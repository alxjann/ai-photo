import { isUnexpected } from "@azure-rest/ai-inference";
import { aiClient } from '../config/ai.config.js';
import { generateEmbedding } from './ai/generateEmbedding.js';

//search prompt
async function rerankWithGPT(query, candidates) {
    if (!candidates || candidates.length === 0) return [];

    const candidateList = candidates.map((c, i) =>
        `[${i + 1}] Tags: ${c.tags || 'none'}\nVisual: ${(c.literal || '').substring(0, 150)}\nContext: ${(c.descriptive || '').substring(0, 100)}`
    ).join('\n\n');

    try {
        const response = await aiClient.path('/chat/completions').post({
            body: {
                model: 'gpt-4o-mini',
                messages: [{
                    role: 'user',
                    content: `You are a photo search relevance judge.

Query: "${query}"

Below are photo candidates. Return the numbers of photos that match the query.

RULES:
- Be LENIENT with vague or general queries (e.g. "dog", "my pet dog") — include any photo that could reasonably match
- Be STRICT with specific queries (e.g. "dog behind gate", "valorant scoreboard") — only include exact matches
- If the query mentions a person ("me", "my", "I") but the photo has no person, still include it if the subject matches
- Prefer returning too many results over too few

${candidateList}

Reply with ONLY a comma-separated list of numbers (e.g. "1,3,5") or "none" if truly nothing matches.
Numbers only, no explanation.`
                }],
                max_tokens: 60,
            }
        });

        if (isUnexpected(response)) throw new Error('rerank failed');

        const raw = response.body.choices[0].message.content?.trim();

        if (!raw || raw.toLowerCase() === 'none') return [];

        const keepIndices = new Set(
            raw.split(',')
               .map(n => parseInt(n.trim()) - 1)
               .filter(n => !isNaN(n) && n >= 0 && n < candidates.length)
        );

        return candidates.filter((_, i) => keepIndices.has(i));

    } catch (err) {
        console.warn(' fail, returning all candidates:', err.message);
        return candidates;
    }
}


// main search function
export const searchImage = async (user, supabase, query) => {

    if (!query || query.trim() === '') {
        const { data, error } = await supabase
            .from('photo')
            .select('id, device_asset_id, descriptive, literal, tags, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { results: data, count: data?.length || 0 };
    }

    const normalizedQuery = query.trim();

    const queryEmbedding = await generateEmbedding(normalizedQuery);
    // adjust search prompt weights
    const { data, error } = await supabase.rpc('hybrid_search_photos', {
        query_text: normalizedQuery,
        query_embedding: queryEmbedding,
        match_count: 20,
        user_id: user.id,
        full_text_weight: 1.0,
        semantic_weight: 2.0,
        rrf_k: 50,
    });

    console.log(`Hybrid search results: ${data?.length ?? 0}`);
    if (error) throw error;

    if (!data || data.length === 0) {
        return { results: [], count: 0 };
    }

    const reranked = await rerankWithGPT(normalizedQuery, data);

    return { results: reranked, count: reranked.length };
};