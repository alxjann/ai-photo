import { processImage } from '../services/processImage.js';

export const batchProcessImagesController = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No image files provided' });
        }

        const totalFiles = req.files.length;
        console.log(`starting batch processing of ${totalFiles} images...`);

        const results = [];
        const errors = [];

        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            try {
                console.log(`\nprocessing image ${i + 1}/${totalFiles}...`);
                
                const result = await processImage(file.buffer);
                
                results.push({
                    index: i,
                    success: true,
                    id: result.id,
                    image_url: result.image_url
                });
                
                console.log(`image ${i + 1}/${totalFiles} processed successfully`);
            } catch (error) {
                console.error(`error processing image ${i + 1}/${totalFiles}:`, error.message);
                errors.push({
                    index: i,
                    error: error.message
                });
            }
        }

        console.log(`\nBatch processing complete:`);
        console.log(`   Success: ${results.length}`);
        console.log(`   Errors: ${errors.length}`);

        res.status(200).json({
            message: 'Batch processing complete',
            total: totalFiles,
            successful: results.length,
            failed: errors.length,
            results: results,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Batch processing error:', error);
        res.status(500).json({ 
            error: 'Batch processing failed',
            details: error.message 
        });
    }
};