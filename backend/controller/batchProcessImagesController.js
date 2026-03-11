import { batchProcessImages } from '../services/batchProcessImages.js';
import { getClientAuthToken } from '../utils/getClientAuthToken.js';

export const batchProcessImagesController = async (req, res) => {
    try {
        const supabase = getClientAuthToken(req, res);
        if (!supabase) return;

        const { data: { user } } = await supabase.auth.getUser();

        if (!req.files || req.files.length === 0)
            return res.status(400).json({ error: 'No image files provided' });

        console.log('device_asset_ids received:', req.body.device_asset_id);

        const deviceAssetIds = Array.isArray(req.body.device_asset_id)
            ? req.body.device_asset_id
            : [req.body.device_asset_id];

        // Optional: accept an array of URIs corresponding to each file (if client provides them)
        const uris = Array.isArray(req.body.uri) ? req.body.uri : (req.body.uri ? [req.body.uri] : []);
        // Optional: accept an array of creation times corresponding to each file
        const creationTimes = Array.isArray(req.body.creation_time)
            ? req.body.creation_time
            : (req.body.creation_time ? [req.body.creation_time] : (req.body.creationTime ? (Array.isArray(req.body.creationTime) ? req.body.creationTime : [req.body.creationTime]) : []));

        const { results, errors } = await batchProcessImages(user, supabase, req.files, deviceAssetIds, uris, creationTimes);

        res.status(200).json({
            message: 'Batch processing complete',
            imageCount: req.files.length,
            successful: results.length,
            failed: errors.length,
            results,
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