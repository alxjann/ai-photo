import { getCompressedImageBuffer } from '../utils/compressImage.js';
import { describeImage } from './ai/describeImage.js';
import { generateEmbedding } from './ai/generateEmbedding.js';

export const processImage = async (user, supabase, image, photo_id, manualDescription = null) => {
    const start = Date.now();
    if (!user || !user.id) throw new Error('Invalid user object or missing user.id');
    const compressedImage = await getCompressedImageBuffer(image);

    const description = await describeImage(compressedImage);

    const literalStart = description.indexOf('[LITERAL]');
    const descriptiveStart = description.indexOf('[DESCRIPTIVE]');
    const tagsStart = description.indexOf('[TAGS]');

    let literal = description.substring(literalStart + 9, descriptiveStart).trim();
    let descriptive = description.substring(descriptiveStart + 13, tagsStart).trim();
    const tags = description.substring(tagsStart + 6).trim().toLowerCase();

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
            descriptive,
            literal,
            tags,
            manual_description: manualDescription?.trim() || null,
            descriptive_embedding: descriptiveEmbedding,
            literal_embedding: literalEmbedding,
        })
        .select()
        .single();

    if (insertError) throw insertError;

    const duration = Date.now() - start;
    console.log(`processImage: completed in ${duration}ms`);

    return insertData;
};