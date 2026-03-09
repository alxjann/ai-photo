import OpenAI from 'openai';
import { generateEmbedding } from './ai/generateEmbedding.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function rerankWithGPT(query, candidates) {
    if (!candidates || candidates.length === 0) return [];

    const candidateList = candidates.map((c, i) =>
        `[${i + 1}] People: ${c.faces || 'none'}\nTags: ${c.tags || 'none'}\nVisual: ${(c.literal || '').substring(0, 150)}\nContext: ${(c.descriptive || '').substring(0, 100)}`
    ).join('\n\n');

    try {
        const response = await openai.chat.completions.create({
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
        });

        const raw = response.choices[0].message.content?.trim();

        if (!raw || raw.toLowerCase() === 'none') return [];

        const keepIndices = new Set(
            raw.split(',')
               .map(n => parseInt(n.trim()) - 1)
               .filter(n => !isNaN(n) && n >= 0 && n < candidates.length)
        );

        return candidates.filter((_, i) => keepIndices.has(i));

    } catch (err) {
        console.warn('Rerank failed, returning all candidates:', err.message);
        return candidates;
    }
}

export const searchImage = async (user, supabase, query) => {
    const normalizedQuery = query.trim();

    const queryEmbedding = await generateEmbedding(normalizedQuery);

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

    if (!data || data.length === 0) return { results: [], count: 0 };

    // Fetch faces for matched photos (not in RPC result)
    const photoIds = data.map(p => p.id);
    const { data: facesData } = await supabase
        .from('photo')
        .select('id, faces')
        .in('id', photoIds);
    const facesMap = Object.fromEntries((facesData || []).map(p => [p.id, p.faces]));
    const dataWithFaces = data.map(p => ({ ...p, faces: facesMap[p.id] || null }));

    const reranked = await rerankWithGPT(normalizedQuery, dataWithFaces);

    return { results: reranked, count: reranked.length };
};