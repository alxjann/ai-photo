import { getCompressedImageBuffer, computePhash } from '../utils/compressImage.js';
import { describeImage } from './ai/describeImage.js';
import { generateEmbedding } from './ai/generateEmbedding.js';
import { enrichTagsWithConceptNet } from './conceptEnrichment.js';

const AI_REFUSAL_PHRASES = [
    "i'm unable",
    "i am unable",
    "i'm sorry",
    "i am sorry",
    "i can't analyze",
    "i cannot analyze",
    "i can't assist",
    "i cannot assist",
    "i'm not able",
    "please provide",
    "no identifiable content",
    "console error message",
];

const CAPABILITY_RULES = [
    {
        triggers: ['bird', 'eagle', 'hawk', 'owl', 'macaw', 'parrot', 'pigeon', 'duck', 'swan', 'heron'],
        inject: ['flying', 'wings', 'can-fly', 'flies'],
    },
    {
        triggers: ['fish', 'jellyfish', 'dolphin', 'whale', 'shark', 'octopus', 'crab', 'shrimp', 'aquatic', 'marine'],
        inject: ['swimming', 'swims', 'underwater', 'aquatic'],
    },
    {
        triggers: ['horse', 'dog', 'cat', 'cow', 'deer', 'lion', 'tiger', 'elephant', 'goat', 'sheep', 'pig', 'wolf', 'fox'],
        inject: ['four-legs', 'quadruped', 'runs'],
    },
    {
        triggers: ['monkey', 'ape', 'chimpanzee', 'gorilla', 'orangutan', 'squirrel', 'koala'],
        inject: ['climbs', 'climbing', 'trees'],
    },
    {
        triggers: ['snake', 'worm', 'caterpillar'],
        inject: ['crawls', 'no-legs'],
    },
];

function validateAIResponse(description) {
    const lower = description.toLowerCase();

    if (!description.includes('[LITERAL]') ||
        !description.includes('[DESCRIPTIVE]') ||
        !description.includes('[TAGS]')) {
        throw new Error('AI_INVALID_RESPONSE: Missing required sections');
    }

    const isRefusal = AI_REFUSAL_PHRASES.some(phrase => lower.includes(phrase));
    if (isRefusal) {
        throw new Error('AI_REFUSED: AI could not analyze this image');
    }

    const literalStart = description.indexOf('[LITERAL]');
    const descriptiveStart = description.indexOf('[DESCRIPTIVE]');
    const tagsStart = description.indexOf('[TAGS]');

    const literal = description.substring(literalStart + 9, descriptiveStart).trim();
    const descriptive = description.substring(descriptiveStart + 13, tagsStart).trim();
    const tags = description.substring(tagsStart + 6).trim();

    if (literal.length < 20) throw new Error('AI_INVALID_RESPONSE: Literal section too short');
    if (descriptive.length < 20) throw new Error('AI_INVALID_RESPONSE: Descriptive section too short');
    if (tags.length < 5) throw new Error('AI_INVALID_RESPONSE: Tags section too short');

    return { literal, descriptive, tags };
}

function enrichTags(tags) {
    const tagList = tags.split(',').map(t => t.trim().toLowerCase());
    const toInject = new Set();

    for (const rule of CAPABILITY_RULES) {
        const matched = rule.triggers.some(trigger => tagList.includes(trigger));
        if (matched) {
            rule.inject.forEach(tag => {
                if (!tagList.includes(tag)) toInject.add(tag);
            });
        }
    }

    if (toInject.size === 0) return tags;
    return [...tagList, ...toInject].join(', ');
}

export const processImage = async (user, supabase, image, device_asset_id, manualDescription = null) => {
    const start = Date.now();
    if (!user || !user.id) throw new Error('Invalid user object or missing user.id');

    const compressedImage = await getCompressedImageBuffer(image);
    const phash = await computePhash(compressedImage);

    const { data: existing } = await supabase
        .from('photo')
        .select('id')
        .eq('user_id', user.id)
        .eq('phash', phash)
        .maybeSingle();

    if (existing) throw new Error('DUPLICATE_IMAGE');

    let parsed;
    let lastError;
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const description = await describeImage(compressedImage);
            parsed = validateAIResponse(description);
            break;
        } catch (err) {
            lastError = err;
            const isAIFailure = err.message.startsWith('AI_REFUSED') || err.message.startsWith('AI_INVALID');
            if (isAIFailure) {
                console.warn(`Attempt ${attempt} failed (${err.message})${attempt === 1 ? ', retrying...' : ', giving up'}`);
                continue;
            }
            throw err;
        }
    }

    if (!parsed) {
        console.warn('AI failed after 2 attempts, saving without embeddings for reprocessing later');

        const { data: insertData, error: insertError } = await supabase
            .from('photo')
            .insert({
                user_id: user.id,
                device_asset_id,
                phash,
                descriptive: '',
                literal: '',
                tags: '',
                manual_description: manualDescription?.trim() || null,
                descriptive_embedding: null,
                literal_embedding: null,
                needs_reprocessing: true,
            })
            .select()
            .single();

        if (insertError) throw insertError;
        console.log(`processImage: saved without AI in ${Date.now() - start}ms (needs_reprocessing=true)`);
        return { ...insertData, needs_reprocessing: true };
    }

    let { literal, descriptive, tags } = parsed;

    tags = await enrichTagsWithConceptNet(supabase, tags.toLowerCase());

    if (manualDescription && manualDescription.trim()) {
        descriptive = `${descriptive} User note: ${manualDescription.trim()}`;
    }

    const descriptiveEmbedding = await generateEmbedding(descriptive);
    const literalEmbedding = await generateEmbedding(literal);

    if (!descriptiveEmbedding || descriptiveEmbedding.length !== 1536) {
        throw new Error(`Invalid descriptive embedding dimension: ${descriptiveEmbedding?.length}`);
    }
    if (!literalEmbedding || literalEmbedding.length !== 1536) {
        throw new Error(`Invalid literal embedding dimension: ${literalEmbedding?.length}`);
    }

    const { data: insertData, error: insertError } = await supabase
        .from('photo')
        .insert({
            user_id: user.id,
            device_asset_id,
            phash,
            descriptive,
            literal,
            tags,
            manual_description: manualDescription?.trim() || null,
            descriptive_embedding: descriptiveEmbedding,
            literal_embedding: literalEmbedding,
            needs_reprocessing: false,
        })
        .select()
        .single();

    if (insertError) throw insertError;

    console.log(`processImage: completed in ${Date.now() - start}ms`);
    return insertData;
};