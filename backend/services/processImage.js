import { supabase } from '../config/supabase.js';
import { getCompressedImageBuffer, getThumbnailBuffer } from '../utils/compressImage.js';
import { describeImage } from './ai/describeImage.js';
import { generateEmbedding } from './ai/generateEmbedding.js';
import phash from 'sharp-phash';

export const processImage = async (image, manualDescription = null) => {
    const compressedImage = await getCompressedImageBuffer(image);
    const thumbnailBuffer = await getThumbnailBuffer(image);

    const imageHash = await phash(compressedImage);

    const { data: existingPhotos } = await supabase
        .from('photo')
        .select('id, phash');

    if (existingPhotos) {
        for (const photo of existingPhotos) {
            if (photo.phash) {
                const distance = hammingDistance(imageHash, photo.phash);
                if (distance < 10) {
                    throw new Error(`Duplicate image detected (perceptual hash distance: ${distance})`);
                }
            }
        }
    }

    const base64Image = `data:image/jpeg;base64,${compressedImage.toString('base64')}`;
    const base64Thumbnail = `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`;
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
            image_data: base64Image,
            thumbnail_data: base64Thumbnail,
            descriptive,
            literal,
            tags,
            phash: imageHash,
            manual_description: manualDescription?.trim() || null,
            descriptive_embedding: descriptiveEmbedding,
            literal_embedding: literalEmbedding,
        })
        .select()
        .single();

    if (insertError) throw insertError;

    return insertData;
};

function hammingDistance(hash1, hash2) {
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) distance++;
    }
    return distance;
}