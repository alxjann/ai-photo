import { getPhoto } from '../services/getPhoto.js';
import { getClientAuthToken } from "../utils/getClientAuthToken.js";

export const getPhotoController = async (req, res) => {
    try {

        const supabase = getClientAuthToken(req, res);

        if (!supabase) return;

        const { data: {user} } = await supabase.auth.getUser();

        const { id } = req.params;

        const data = await getPhoto(user, supabase, id);

        res.status(200).json(data);

    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch photo',
            details: error.message
        });
    }
};
