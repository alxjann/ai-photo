import { isUnexpected } from "@azure-rest/ai-inference";
import { aiClient } from '../config/ai.config.js';

const MAX_TAGS_PER_CONCEPT = 6;
const TOTAL_ENRICHMENT_TIMEOUT_MS = 3000;

const SKIP_CONCEPTS = new Set([
    'photograph', 'photo', 'image', 'picture', 'screenshot',
    'person', 'people', 'selfie', 'portrait', 'group', 'characters',
    'happy', 'peaceful', 'calm', 'exciting', 'energetic', 'melancholic',
    'playful', 'funny', 'humor', 'colorful', 'vibrant', 'muted',
    'indoor', 'outdoor', 'daylight', 'night', 'low-light', 'sunset',
    'philippines', 'filipino', 'manila',
    'gaming', 'working', 'studying', 'eating', 'traveling', 'activities',
    'animals', 'creatures', 'organisms', 'wildlife',
    'digital-art', 'illustration', 'meme', 'technology', 'cartoon',
    'green', 'red', 'blue', 'yellow', 'white', 'black', 'brown',
    'warm-tones', 'cool-tones', 'monochrome',
    'rural', 'urban', 'safety',
    'aspin', 'asong-pinoy',
    'home', 'house', 'building', 'indoor', 'outdoor', 'gate', 'fence', 'yard',
    'grass', 'lawn', 'field', 'ground', 'soil', 'sand', 'water', 'sky', 'tree', 'plant',
    'fur', 'coat', 'skin', 'hair', 'tail', 'ears', 'paws', 'claws', 'whiskers',
]);

async function getGPTTags(concept) {
    try {
        const response = await aiClient.path('/chat/completions').post({
            body: {
                model: 'gpt-4o-mini',
                messages: [{
                    role: 'user',
                    content: `You are a visual tagging assistant. Given a concept, list related tags that describe what it physically IS, what it CAN DO, or what it is MADE OF. Only factual, visual properties — no emotions, no situations, no cultural associations.

RULES:
- Return ONLY comma-separated single words or short hyphenated terms
- No sentences, no explanations
- Maximum ${MAX_TAGS_PER_CONCEPT} tags
- Only physical, factual, visual properties

EXAMPLES:
eagle → bird, raptor, wings, feathers, beak, talons
notebook → paper, pages, lined, binding, handwriting, writing
beach → sand, waves, ocean, shore, coastal, saltwater
chicken → poultry, feathers, beak, wings, bird, egg-laying
laptop → screen, keyboard, portable, electronic, computer, battery
soup → liquid, bowl, broth, hot, steam, ladle

CONCEPT: ${concept}
TAGS:`
                }],
                max_tokens: 60,
            }
        });

        if (isUnexpected(response)) throw new Error('GPT failed');

        const raw = response.body.choices[0].message.content?.trim();
        if (!raw) throw new Error('Empty response');

        return raw
            .split(',')
            .map(t => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').trim())
            .filter(t => t.length >= 3 && t !== concept)
            .slice(0, MAX_TAGS_PER_CONCEPT);

    } catch (err) {
        console.warn(`GPT enrichment failed for "${concept}":`, err.message);
        return [];
    }
}

export const enrichTagsWithConceptNet = async (supabase, tags) => {
    const tagList = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    const enriched = new Set(tagList);

    try {
        await Promise.race([
            Promise.all(tagList.map(async (concept) => {
                if (concept.length < 3 || /^\d+$/.test(concept)) return;
                if (SKIP_CONCEPTS.has(concept)) return;

                try {
                    const { data: cached } = await supabase
                        .from('concept_cache')
                        .select('enriched_tags')
                        .eq('concept', concept)
                        .maybeSingle();

                    let conceptTags = [];

                    if (cached) {
                        conceptTags = cached.enriched_tags || [];
                        console.log(`Enrichment cache hit for "${concept}":`, conceptTags);
                    } else {
                        conceptTags = await getGPTTags(concept);
                        console.log(`GPT enrichment for "${concept}":`, conceptTags);

                        supabase.from('concept_cache').upsert({
                            concept,
                            enriched_tags: conceptTags,
                            queried_at: new Date().toISOString(),
                        }, { onConflict: 'concept' }).then(() => {}).catch(() => {});
                    }

                    conceptTags.forEach(t => enriched.add(t));
                } catch (err) {
                    console.warn(`Enrichment skipped for "${concept}":`, err.message);
                }
            })),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('enrichment timeout')), TOTAL_ENRICHMENT_TIMEOUT_MS)
            )
        ]);
    } catch (err) {
        console.warn('Enrichment timed out or failed:', err.message);
    }

    return Array.from(enriched).join(', ');
};