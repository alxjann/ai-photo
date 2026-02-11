import { supabase } from '../config/supabase.js';
import { getCompressedImageBuffer } from '../utils/compressImage.js';
import { describeImage } from './ai/describeImage.js';
import { generateEmbedding } from './ai/generateEmbedding.js';

export const processImage = async (image) => {
    /*
    compress image (to save tokens)
    generate description
    generate embed
    save description and embed to db
    */
    const compressedImage = await getCompressedImageBuffer(image);

    const description = await describeImage(compressedImage);

    const start = description.indexOf("[DESCRIPTIVE]");
    const descriptive = description.substring(start + 13).trim();
    const literal = description.substring(description.indexOf("[LITERAL]") + 9, start).trim();
    
    const descriptiveEmbedding = await generateEmbedding(descriptive);
    const literalEmbedding = await generateEmbedding(literal);

    const { error } = await supabase
        .from("photo")
        .insert({
            descriptive: descriptive,
            literal: literal,
            descriptive_embedding: descriptiveEmbedding,
            literal_embedding: literalEmbedding
        });

    if (error) throw error;

    console.log('insert successful');
}