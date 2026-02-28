import { describeImage } from './ai/describeImage.js';
import { generateEmbedding } from './ai/generateEmbedding.js';

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