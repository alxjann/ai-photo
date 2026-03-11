import { processImage } from './processImage.js';

export const batchProcessImages = async (user, supabase, files, deviceAssetIds, uris = [], creationTimes = []) => {
    if (!files || files.length === 0)
        throw new Error('No image files provided');

    const ids = Array.isArray(deviceAssetIds) ? deviceAssetIds : [deviceAssetIds];

    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
        try {
            const uri = Array.isArray(uris) && uris[i] ? uris[i] : null;
            const creationTime = Array.isArray(creationTimes) && creationTimes[i] ? creationTimes[i] : null;
            const result = await processImage(user, supabase, files[i].buffer, ids[i], uri, creationTime);
            results.push({ index: i, photo: result });
        } catch (error) {
            errors.push({ index: i, error: error.message });
        }
    }

    return { results, errors };
};