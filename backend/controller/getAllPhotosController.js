import { getAllPhotos } from "../services/getAllPhotos.js";

export const getAllPhotosController = async (req, res) => {
    try {
        const result = await getAllPhotos();
        res.status(200).json({
            count: result.length,
            result
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch photos',
            details: error.message,
        });
    }
};