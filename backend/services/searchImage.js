import { generateEmbedding } from './ai/generateEmbedding.js';
import { aiClient } from '../config/ai.config.js';
import { isUnexpected } from '@azure-rest/ai-inference';

const DISH_TAGS = [
    'pork-adobo', 'chicken-adobo', 'beef-adobo',
    'sinigang', 'pork-sinigang', 'beef-sinigang', 'shrimp-sinigang',
    'bicol-express', 'kare-kare', 'lechon', 'pinakbet',
    'chicken-curry', 'tinola', 'bulalo', 'caldereta',
    'pancit', 'lumpia', 'sisig', 'dinuguan', 'nilaga',
];
const SYNONYM_MAP = {
    'tv': 'screen',
    'television': 'screen',
    'telly': 'screen',
    'monitor': 'screen',
    'mobile legends': 'mobile-legends',
    'ml': 'mobile-legends',
    'mlbb': 'mobile-legends',
    'genshin': 'genshin-impact',
    'codm': 'call-of-duty-mobile',
    'coc': 'clash-of-clans',
    'display': 'screen',
    'phone': 'smartphone',
    'cellphone': 'smartphone',
    'mobile': 'smartphone',
    'pic': 'photograph',
    'picture': 'photograph',
    'photo': 'photograph',
    'vid': 'video',
    'clip': 'video',
    'selfie': 'portrait',
    'nighttime': 'night',
    'lunch': 'food',
    'dinner': 'food',
    'meal': 'food',
    'ulam': 'food',
    'kain': 'food',
    'nightshot': 'night',
    'daytime': 'daylight',
    'outside': 'outdoor',
    'inside': 'indoor',
};

function applySynonyms(query) {
    const words = query.toLowerCase().split(/\s+/);
    const mapped = words.map(w => SYNONYM_MAP[w] || w);
    return mapped.join(' ');
}

function detectDishTag(query) {
    const q = query.toLowerCase().replace(/\s+/g, '-');
    const qWords = query.toLowerCase().split(/\s+/);
    return DISH_TAGS.find(tag => {
        const tagWords = tag.split('-');
        return q.includes(tag) || tagWords.every(w => qWords.includes(w));
    }) || null;
}

async function expandQuery(supabase, query) {
    const normalized = query.trim().toLowerCase();

    try {
        const { data: cached } = await supabase
            .from('query_cache')
            .select('expanded_query')
            .eq('query', normalized)
            .maybeSingle();

        if (cached) {
            console.log(`Query cache hit: "${normalized}" → "${cached.expanded_query}"`);
            return cached.expanded_query;
        }
    } catch (e) {
        console.warn('Query cache read failed:', e.message);
    }

    try {
        const response = await aiClient.path('/chat/completions').post({
            body: {
                model: 'gpt-4o-mini',
                messages: [{
                    role: 'user',
                    content: `You help improve photo search queries by expanding them into visual keywords.

RULES:
- Return ONLY comma-separated keywords
- No sentences, no explanations
- 8-12 keywords max
- Be scientifically accurate (e.g. "four legs" = mammals/reptiles NOT birds)
- Focus on what would VISUALLY appear in the photo

EXAMPLES:
Input: dog sitting
Output: dog, sitting, paws, fur, breed, collar, alert, posed

Input: animals with four legs
Output: dog, cat, horse, mammal, quadruped, fur, paws, hooves, four-legged

Input: studying late at night
Output: desk, notebook, lamp, pen, textbook, indoor, dark, artificial-light, night, focused

Input: vacation at the beach
Output: sand, ocean, waves, swimsuit, umbrella, sunny, tropical, water, shore

Input: birthday celebration
Output: cake, candles, balloons, party, friends, smiling, colorful, celebration

Input: assignment
Output: notebook, notes, pen, paper, desk, handwritten, lined, academic, school

Input: ${query}
Output:`
                }],
                max_tokens: 80,
            }
        });

        if (isUnexpected(response)) throw new Error('GPT failed');

        const raw = response.body.choices[0].message.content?.trim();
        if (!raw) throw new Error('Empty response');

        const expanded = raw
            .split(',')
            .map(t => t.trim().replace(/[^a-zA-Z0-9\s-]/g, '').trim())
            .filter(t => t.length > 1)
            .join(', ');

        const fullQuery = `${query}, ${expanded}`;
        console.log(`Query expanded: "${query}" → "${fullQuery}"`);

        supabase.from('query_cache').upsert({
            query: normalized,
            expanded_query: fullQuery,
            created_at: new Date().toISOString(),
        }, { onConflict: 'query' }).then(() => {}).catch(() => {});

        return fullQuery;

    } catch (e) {
        console.warn('Query expansion failed, using original:', e.message);
        return query;
    }
}

async function rerankWithGPT(supabase, query, candidates) {
    if (!candidates || candidates.length === 0) return [];
    if (candidates.length <= 2) return candidates;

    const cacheKey = `${query}::${candidates.map(c => c.id).join(',')}`;
    try {
        const { data: cached } = await supabase
            .from('rerank_cache')
            .select('relevant_ids')
            .eq('cache_key', cacheKey)
            .maybeSingle();
        if (cached) {
            console.log('Rerank cache hit');
            const idSet = new Set(cached.relevant_ids);
            return candidates.filter(c => idSet.has(c.id));
        }
    } catch (e) {}

    const candidateList = candidates.map((c, i) =>
        `[${i + 1}] ID:${c.id}\nTags: ${c.tags || ''}\nVisual: ${(c.literal || '').substring(0, 150)}\nContext: ${(c.descriptive || '').substring(0, 100)}`
    ).join('\n');

    try {
        const response = await aiClient.path('/chat/completions').post({
            body: {
                model: 'gpt-4o-mini',
                messages: [{
                    role: 'user',
                    content: `You are a photo search relevance judge.

Query: "${query}"

Below are photo candidates. Return ONLY the numbers of photos that genuinely match the query.
Be strict — only include photos that clearly match what the user is looking for.

${candidateList}

Reply with ONLY a comma-separated list of numbers (e.g. "1,3,5") or "none" if nothing matches.
Numbers only, no explanation.`
                }],
                max_tokens: 50,
            }
        });

        if (isUnexpected(response)) throw new Error('GPT rerank failed');

        const raw = response.body.choices[0].message.content?.trim();
        console.log(`Rerank: "${query}" → kept: ${raw}`);

        if (!raw || raw.toLowerCase() === 'none') return [];

        const keepIndices = new Set(
            raw.split(',')
               .map(n => parseInt(n.trim()) - 1)
               .filter(n => !isNaN(n) && n >= 0 && n < candidates.length)
        );

        const reranked = candidates.filter((_, i) => keepIndices.has(i));

        supabase.from('rerank_cache').upsert({
            cache_key: cacheKey,
            query,
            relevant_ids: reranked.map(c => c.id),
            created_at: new Date().toISOString(),
        }, { onConflict: 'cache_key' }).then(() => {}).catch(() => {});

        return reranked;

    } catch (err) {
        console.warn('Rerank failed, returning unfiltered results:', err.message);
        return candidates;
    }
}

export const searchImage = async (user, supabase, query) => {
    if (!query || query.trim() === '') {
        const { data, error } = await supabase
            .from('photo')
            .select('id, device_asset_id, descriptive, literal, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { results: data, count: data?.length || 0 };
    }

    const normalizedQuery = applySynonyms(query.trim());
    if (normalizedQuery !== query.trim()) {
        console.log(`Synonyms applied: "${query.trim()}" → "${normalizedQuery}"`);
    } else {
        console.log(`Synonyms applied: "${query.trim()}" → "${normalizedQuery}"`);
    }

    const dishTag = detectDishTag(normalizedQuery);
    if (dishTag) {
        console.log('Dish query detected:', dishTag);
        const { data, error } = await supabase
            .from('photo')
            .select('id, device_asset_id, descriptive, literal, created_at, tags')
            .eq('user_id', user.id)
            .ilike('tags', `%${dishTag}%`);

        if (error) throw error;
        return { results: data || [], count: data?.length || 0 };
    }

    const words = normalizedQuery.split(/\s+/);
    const SPECIFIC_TERMS = /screenshot|selfie|photo|video|kahoot|minecraft|valorant|pokemon|roblox|genshin|tiktok|youtube|netflix|spotify|sinigang|adobo|lechon|kare-kare|tinola|pancit|lumpia/i;
    const isSpecificSingleWord = words.length === 1 && SPECIFIC_TERMS.test(normalizedQuery);
    const isContextual = !isSpecificSingleWord;

    const expandedQuery = isContextual
        ? await expandQuery(supabase, normalizedQuery)
        : normalizedQuery;
    if (!isContextual) console.log(`Query not expanded (specific): "${normalizedQuery}"`);

    const singularize = w => w.endsWith('s') && w.length > 4 ? w.slice(0, -1) : w;
    const STOP_WORDS = new Set(['with', 'and', 'the', 'for', 'from', 'also', 'that', 'this', 'four', 'legs', 'two', 'three', 'five', 'can', 'are', 'have', 'its']);
    const queryWords = expandedQuery
        .replace(/[,;]/g, ' ')
        .split(/\s+/)
        .map(w => w.replace(/[^a-z0-9-]/g, ''))
        .filter(w => w.length > 3 && !STOP_WORDS.has(w))
        .map(singularize);
    if (queryWords.length > 0) {
        const tagMatchSets = await Promise.all(queryWords.map(async (word) => {
            const { data } = await supabase
                .from('photo')
                .select('id, device_asset_id, descriptive, literal, created_at, tags')
                .eq('user_id', user.id)
                .ilike('tags', `%${word}%`);
            return new Map((data || []).map(p => [p.id, p]));
        }));

        let tagResults;
        if (tagMatchSets.length === 1) {
            tagResults = Array.from(tagMatchSets[0].values());
            console.log(`Tag match: ${tagResults.length} results for:`, queryWords);
        } else {
            let intersection = new Map(tagMatchSets[0]);
            for (let i = 1; i < tagMatchSets.length; i++) {
                for (const id of intersection.keys()) {
                    if (!tagMatchSets[i].has(id)) intersection.delete(id);
                }
            }
            if (intersection.size > 0) {
                tagResults = Array.from(intersection.values());
                console.log(`Tag intersection match: ${tagResults.length} results for:`, queryWords);
            } else {
                const union = new Map();
                tagMatchSets.forEach(set => set.forEach((v, k) => union.set(k, v)));
                tagResults = Array.from(union.values());
                console.log(`Tag union match: ${tagResults.length} results for:`, queryWords);
            }
        }

        if (tagResults.length > 0) {
            const reranked = await rerankWithGPT(supabase, query, tagResults);
            console.log(`Tag rerank: ${tagResults.length} → ${reranked.length} results`);
            if (reranked.length > 0) return { results: reranked, count: reranked.length };
        }

        console.log(`Tag match empty for: ${queryWords} — falling through to hybrid`);
    }

    const queryEmbedding = await generateEmbedding(expandedQuery);

    console.log('Hybrid search with expanded query');
    const { data, error } = await supabase.rpc('hybrid_search_photos', {
        query_text: normalizedQuery,
        query_embedding: queryEmbedding,
        match_count: 20,
        user_id: user.id,
        full_text_weight: 0.5,
        semantic_weight: 3,
        rrf_k: 50,
    });

    console.log('hybrid result count:', data?.length, 'error:', error);

    if (error) throw error;

    const reranked = await rerankWithGPT(supabase, query, data || []);
    console.log(`Rerank: ${data?.length} → ${reranked.length} results`);

    return { results: reranked, count: reranked.length };
};