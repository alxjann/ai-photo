import { deletePhoto } from "../services/deletePhoto.js";

export const deletePhotoController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Photo ID is required' });
        }

        await deletePhoto(id);

        res.status(200).json({
            message: 'Photo deleted successfully',
            id: id
        });

    } catch (error) {
        console.error('Delete photo error:', error);
        res.status(500).json({
            error: 'Failed to delete photo',
            details: error.message
        });
    }
};
