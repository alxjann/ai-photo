import { deletePhoto } from "../services/deletePhoto.js";
import { getClientAuthToken } from "../utils/getClientAuthToken.js";

export const deletePhotoController = async (req, res) => {
    try {
        const supabase = getClientAuthToken(req, res);

        if (!supabase) return;

        const { data: {user} } = await supabase.auth.getUser();
        const { assetId } = req.params;

        if (!assetId) {
            return res.status(400).json({ error: 'Photo ID is required' });
        }

        await deletePhoto(user, supabase, assetId);

        res.status(200).json({
            message: 'Photo deleted successfully',
            device_asset_id: assetId
        });

    } catch (error) {
        console.error('Delete photo error:', error);
        res.status(500).json({
            error: 'Failed to delete photo',
            details: error.message
        });
    }
};