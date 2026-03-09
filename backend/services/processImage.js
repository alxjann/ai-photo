import { getCompressedImageBuffer } from '../utils/compressImage.js';
import { describeImage } from './ai/describeImage.js';
import { generateEmbedding } from './ai/generateEmbedding.js';
import { detectFacesInImage } from './faceRecognition.js';

export const processImage = async (user, supabase, image, device_asset_id) => {
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

    console.log(`processImage: completed in ${Date.now() - start}ms`);
    return insertData;
};
