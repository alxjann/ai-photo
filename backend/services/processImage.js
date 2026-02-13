import { supabase } from '../config/supabase.js';
import { getCompressedImageBuffer } from '../utils/compressImage.js';
import { describeImage } from './ai/describeImage.js';
import { generateEmbedding } from './ai/generateEmbedding.js';

export const processImage = async (image) => {
    const compressedImage = await getCompressedImageBuffer(image);
    const base64Image = `data:image/jpeg;base64,${compressedImage.toString('base64')}`;
    
    const description = await describeImage(compressedImage);
    
    const literalStart = description.indexOf("[LITERAL]");
    const descriptiveStart = description.indexOf("[DESCRIPTIVE]");
    const tagsStart = description.indexOf("[TAGS]");
    
    const literal = description.substring(literalStart + 9, descriptiveStart).trim();
    const descriptive = description.substring(descriptiveStart + 13, tagsStart).trim();
    const tags = description.substring(tagsStart + 6).trim().toLowerCase();
    
    const descriptiveEmbedding = await generateEmbedding(descriptive);
    const literalEmbedding = await generateEmbedding(literal);
    
    if (!descriptiveEmbedding || descriptiveEmbedding.length !== 1536) {
        throw new Error(`Invalid descriptive embedding dimension: ${descriptiveEmbedding?.length}`);
    }
    if (!literalEmbedding || literalEmbedding.length !== 1536) {
        throw new Error(`Invalid literal embedding dimension: ${literalEmbedding?.length}`);
    }
    
    const { data: insertData, error: insertError } = await supabase
        .from("photo")
        .insert({
            image_data: base64Image,
            descriptive: descriptive,
            literal: literal,
            tags: tags,
            descriptive_embedding: descriptiveEmbedding,
            literal_embedding: literalEmbedding
        })
        .select()
        .single();

    if (insertError) throw insertError;
    
    return insertData;
};