import { getAllPhotosService } from '../services/getAllPhotos.js';

export const getAllPhotosController = async (req, res) => {
    try {
        const photos = await getAllPhotosService();
        res.status(200).json({
            success: true,
            count: photos.length,
            results: photos,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch photos',
            details: error.message,
        });
    }
};