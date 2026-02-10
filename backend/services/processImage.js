//import { supabase } from '../config/supabase.js';
import { getCompressedImageBuffer } from '../utils/compressImage.js';
import { describeImage } from './ai/describeImage.js';
import { generateEmbedding } from './ai/generateEmbedding.js';

export const processImage = async (image) => {
    /*
    compress image
    generate description
    genrate embed
    save description and embed
    */
    const compressedImage = await getCompressedImageBuffer(image);

    const description = await describeImage(compressedImage);
    const vectorEmbedding = await generateEmbedding(description);

    return { description, vectorEmbedding };

}