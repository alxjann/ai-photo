import { getPhoto } from '../services/getPhoto.js';

export const getPhotoController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Photo ID is required' });
        }

        const data = await getPhoto(id);

        res.status(200).json(data);

    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch photo',
            details: error.message
        });
    }
};