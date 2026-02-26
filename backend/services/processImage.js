import { getCompressedImageBuffer } from '../utils/compressImage.js';
import { describeImage } from './ai/describeImage.js';
import { imageEmbedding } from './ai/imageEmbedding.js';

export const processImage = async (user, supabase, image, photo_id, manualDescription = null) => {
    const start = Date.now();
    if (!user || !user.id) throw new Error('Invalid user object or missing user.id');
    const compressedImage = await getCompressedImageBuffer(image);

    let descriptive = "";

    if (manualDescription && manualDescription.trim())
        descriptive = `${descriptive} User note: ${manualDescription.trim()}`;

    const embedding = await imageEmbedding(compressedImage);

    const { data: insertData, error: insertError } = await supabase
        .from('images')
        .insert({
            user_id: user.id,
            photo_id: photo_id, 
            manual_description: manualDescription?.trim() || null,
            embedding: embedding
        })
        .select()
        .single();

    if (insertError) throw insertError;

    const duration = Date.now() - start;
    console.log(`processImage: completed in ${duration}ms`);

    return insertData;
};
