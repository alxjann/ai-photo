import { processImage } from './processImage.js';

export const batchProcessImages = async (user, files) => {
    if (!files || files.length === 0) 
        throw new Error('No image files provided');
    

    const totalFiles = files.length;
    console.log(`Starting batch processing of ${totalFiles} images...`);

    const results = [];
    const errors = [];

    // Process images sequentially
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            console.log(`\nProcessing image ${i + 1}/${totalFiles}...`);
            const result = await processImage(user, file.buffer);
            results.push({
                index: i,
                photo: result
            });
            console.log(`Image ${i + 1}/${totalFiles} processed successfully`);
        } catch (error) {
            console.error(`Error processing image ${i + 1}/${totalFiles}:`, error.message);
            errors.push({
                index: i,
                error: error.message
            });
        }
    }

    console.log(`\nBatch processing complete:`);
    console.log(`    Success: ${results.length}`);
    console.log(`    Errors: ${errors.length}`);

    return {
        results,
        errors
    };
};
