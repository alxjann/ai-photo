import { supabase } from '../config/supabase.js';
import { getCompressedImageBuffer } from '../utils/compressImage.js';
import { describeImage } from './ai/describeImage.js';
import { generateEmbedding } from './ai/generateEmbedding.js';

export const processImage = async (image) => {
    try {
        // 1. Compress image
        const compressedImage = await getCompressedImageBuffer(image);
        
        // 2. Convert to base64 for database storage
        const base64Image = `data:image/jpeg;base64,${compressedImage.toString('base64')}`;
        console.log('img converted to base64 (size:', Math.round(base64Image.length / 1024), 'KB)');
        
        // 3. Get AI description
        const description = await describeImage(compressedImage);
        const start = description.indexOf("[DESCRIPTIVE]");
        const descriptive = description.substring(start + 13).trim();
        const literal = description.substring(description.indexOf("[LITERAL]") + 9, start).trim();
        
        console.log('Descriptive:', descriptive);
        console.log('Literal:', literal);
        
        // 4. Generate embeddings
        console.log('Generating embeddings...');
        const descriptiveEmbedding = await generateEmbedding(descriptive);
        const literalEmbedding = await generateEmbedding(literal);
        
        // 5. Validate embeddings
        if (!descriptiveEmbedding || descriptiveEmbedding.length !== 1536) {
            throw new Error(`Invalid descriptive embedding dimension: ${descriptiveEmbedding?.length}`);
        }
        if (!literalEmbedding || literalEmbedding.length !== 1536) {
            throw new Error(`Invalid literal embedding dimension: ${literalEmbedding?.length}`);
        }
        
        console.log('Embeddings generated (1536 dimensions each)');
        
        // 6. Insert into database with base64 image
        const { data: insertData, error: insertError } = await supabase
            .from("photo")
            .insert({
                image_data: base64Image,  // Store base64 image
                descriptive: descriptive,
                literal: literal,
                descriptive_embedding: descriptiveEmbedding,
                literal_embedding: literalEmbedding
            })
            .select()
            .single();

        if (insertError) {
            console.error('Database error:', insertError);
            throw insertError;
        }

        console.log('Image processed and stored successfully');
        
        return insertData;
    } catch (error) {
        console.error('Error in processImage:', error);
        throw error;
    }
};