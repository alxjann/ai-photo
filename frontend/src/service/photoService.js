import OpenAI from 'openai';
import { getCompressedImageBuffer } from '../utils/compressImage.js';
import { describeImage, generateEmbedding } from './ai.service.js';
import { detectFacesInImage } from './face.service.js';

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
            model: 'gpt-4.1-mini',
            messages: [{
                role: 'user',
                content: `You are a photo search relevance judge.

<<<<<<< HEAD
Query: "${query}"
=======
      const data = await response.json();
      return {
        device_asset_id: photo.id || photo.assetId || photo.device_asset_id || null,
        uri: result.assets[0].uri,
        descriptive: data.photo?.descriptive || null,
        literal: data.photo?.literal || null,
        id: data.photo?.id || null,
        category: data.photo?.category,
        tags: data.photo?.tags,
        created_at: data.photo?.created_at || null,
      };
    } catch (error) {
        console.log("Upload failed", error);
        throw error;
    }
};
>>>>>>> fbb9ee40c1dc818aa335980e68dcaaef1109dcfd

Below are photo candidates. Return the numbers of photos that match the query.

RULES:
- Be LENIENT with vague or general queries (e.g. "dog", "my pet dog") â€” include any photo that could reasonably match
- Be STRICT with specific queries (e.g. "dog behind gate", "valorant scoreboard") â€” only include exact matches
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

export const getAllPhotos = async (user, supabase) => {
    const { data, error } = await supabase
        .from('photo')
        .select('id, device_asset_id, descriptive, literal, tags, category, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const getPhoto = async (user, supabase, id) => {
    const { data, error } = await supabase
        .from('photo')
        .select('id, device_asset_id, descriptive, literal, tags, created_at')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (error) throw error;
    return data;
};

export const deletePhoto = async (user, supabase, id) => {
    if (!id) throw new Error('Photo ID is required');

    console.log('Deleting photo id:', id);

    const { data, error } = await supabase
        .from('photo')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Delete error:', error);
        throw error;
    }

    console.log('Photo deleted successfully:', id);
    return data;
};

export const processPhoto = async (user, supabase, image, device_asset_id) => {
    const start = Date.now();
    if (!user || !user.id) throw new Error('Invalid user object or missing user.id');

    const compressedImage = await getCompressedImageBuffer(image);

    const { data: knownFaces } = await supabase
        .from('known_face')
        .select('name, descriptor')
        .eq('user_id', user.id);

    const { data: existing } = await supabase
        .from('photo')
        .select('id')
        .eq('user_id', user.id)
        .eq('device_asset_id', device_asset_id)
        .maybeSingle();

    if (existing) throw new Error('DUPLICATE_IMAGE');

    const description = await describeImage(compressedImage);

    const literalStart = description.indexOf('[LITERAL]');
    const descriptiveStart = description.indexOf('[DESCRIPTIVE]');
    const tagsStart = description.indexOf('[TAGS]');
    const categoryStart = description.indexOf('[CATEGORY]');

    const literal = description.substring(literalStart + 9, descriptiveStart).trim();
    const descriptive = description.substring(descriptiveStart + 13, tagsStart).trim();
    const tags = description.substring(tagsStart + 6, categoryStart).trim().toLowerCase();
    const category = description.substring(categoryStart + 10).trim().toLowerCase();

    const [descriptiveEmbedding, literalEmbedding, faces] = await Promise.all([
        generateEmbedding(descriptive),
        generateEmbedding(literal),
        knownFaces?.length > 0
            ? detectFacesInImage(image, knownFaces)
            : Promise.resolve(null),
    ]);

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
            descriptive,
            literal,
            tags,
            category,
            faces,
            descriptive_embedding: descriptiveEmbedding,
            literal_embedding: literalEmbedding,
        })
        .select()
        .single();

    if (insertError) throw insertError;

    console.log(`processPhoto: completed in ${Date.now() - start}ms`);
    return insertData;
};

export const batchProcessPhotos = async (user, supabase, files, deviceAssetIds) => {
    if (!files || files.length === 0)
        throw new Error('No image files provided');

    const ids = Array.isArray(deviceAssetIds) ? deviceAssetIds : [deviceAssetIds];

    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
        try {
            const result = await processPhoto(user, supabase, files[i].buffer, ids[i]);
            results.push({ index: i, photo: result });
        } catch (error) {
            errors.push({ index: i, error: error.message });
        }
    }

    return { results, errors };
};

export const reprocessPhoto = async ({ supabase, userId, photoId, fileBuffer }) => {
    const { data: photo, error: fetchError } = await supabase
        .from('photo')
        .select('id')
        .eq('id', photoId)
        .eq('user_id', userId)
        .single();

    if (fetchError || !photo) {
        const err = new Error('Photo not found');
        err.status = 404;
        throw err;
    }

    const description = await describeImage(fileBuffer);

    const literalStart = description.indexOf('[LITERAL]');
    const descriptiveStart = description.indexOf('[DESCRIPTIVE]');
    const tagsStart = description.indexOf('[TAGS]');

    const literal = description.substring(literalStart + 9, descriptiveStart).trim();
    const descriptive = description.substring(descriptiveStart + 13, tagsStart).trim();
    const tags = description.substring(tagsStart + 6).trim().toLowerCase();

    const [descriptiveEmbedding, literalEmbedding] = await Promise.all([
        generateEmbedding(descriptive),
        generateEmbedding(literal),
    ]);

    const { data: updated, error: updateError } = await supabase
        .from('photo')
        .update({
            descriptive,
            literal,
            tags,
            descriptive_embedding: descriptiveEmbedding,
            literal_embedding: literalEmbedding,
            updated_at: new Date().toISOString(),
        })
        .eq('id', photoId)
        .eq('user_id', userId)
        .select()
        .single();

    if (updateError) throw updateError;

    return updated;
};

export const searchPhotos = async (user, supabase, query) => {
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

export const updatePhotoDescriptions = async ({
    supabase,
    userId,
    photoId,
    literal,
    descriptive,
}) => {
    const nextLiteral = String(literal ?? '').trim();
    const nextDescriptive = String(descriptive ?? '').trim();

    if (!nextLiteral || !nextDescriptive) {
        const err = new Error('Literal and descriptive are required');
        err.status = 400;
        throw err;
    }

    const { data: photo, error: fetchError } = await supabase
        .from('photo')
        .select('id')
        .eq('id', photoId)
        .eq('user_id', userId)
        .single();

    if (fetchError || !photo) {
        const err = new Error('Photo not found');
        err.status = 404;
        throw err;
    }

    const [literalEmbedding, descriptiveEmbedding] = await Promise.all([
        generateEmbedding(nextLiteral),
        generateEmbedding(nextDescriptive),
    ]);

    const { data: updated, error: updateError } = await supabase
        .from('photo')
        .update({
            literal: nextLiteral,
            descriptive: nextDescriptive,
            literal_embedding: literalEmbedding,
            descriptive_embedding: descriptiveEmbedding,
            updated_at: new Date().toISOString(),
        })
        .eq('id', photoId)
        .eq('user_id', userId)
        .select('id, device_asset_id, descriptive, literal, tags, category, created_at, updated_at')
        .single();

    if (updateError) throw updateError;

    return updated;
};