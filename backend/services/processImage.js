import { getCompressedImageBuffer } from '../utils/compressImage.js';
import { describeImage } from './ai/describeImage.js';
import { generateEmbedding } from './ai/generateEmbedding.js';
import { detectPeople } from './detectPeople.js';

export const processImage = async (user, supabase, image, device_asset_id) => {
    const start = Date.now();
    if (!user || !user.id) throw new Error('Invalid user object or missing user.id');

    const compressedImage = await getCompressedImageBuffer(image);

    const { data: existing } = await supabase
        .from('photo')
        .select('id')
        .eq('user_id', user.id)
        .eq('device_asset_id', device_asset_id)
        .maybeSingle();

    if (existing) throw new Error('DUPLICATE_IMAGE');

    const [description, detectedPeople] = await Promise.all([
        describeImage(compressedImage),
        detectPeople(user, supabase, compressedImage),
    ]);

    const literalStart = description.indexOf('[LITERAL]');
    const descriptiveStart = description.indexOf('[DESCRIPTIVE]');
    const tagsStart = description.indexOf('[TAGS]');

    const literal = description.substring(literalStart + 9, descriptiveStart).trim();
    const descriptive = description.substring(descriptiveStart + 13, tagsStart).trim();

    const baseTags = description.substring(tagsStart + 6).trim().toLowerCase();
    const peopleTags = detectedPeople.map(name => `person:${name}`).join(', ');
    const tags = peopleTags ? `${baseTags}, ${peopleTags}` : baseTags;

    const [descriptiveEmbedding, literalEmbedding] = await Promise.all([
        generateEmbedding(descriptive),
        generateEmbedding(literal),
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
            descriptive_embedding: descriptiveEmbedding,
            literal_embedding: literalEmbedding,
            people: detectedPeople,
        })
        .select()
        .single();

    if (insertError) throw insertError;

    console.log(`processImage: completed in ${Date.now() - start}ms, people: [${detectedPeople.join(', ')}]`);
    return insertData;
};