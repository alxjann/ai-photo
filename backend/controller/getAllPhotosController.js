import { getAllPhotos } from "../services/getAllPhotos.js";
import { getClientAuthToken } from "../utils/getClientAuthToken.js";

export const getAllPhotosController = async (req, res) => {
    try {
        const supabase = getClientAuthToken(req, res);

        if (!supabase) return;

        const { data: {user} } = await supabase.auth.getUser();

        const result = await getAllPhotos(user, supabase);
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