import { getClientAuthToken } from '../utils/getClientAuthToken.js';

export const getUnknownFacesController = async (req, res) => {
    try {
        const supabase = getClientAuthToken(req, res);
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const { data, error } = await supabase
            .from('unknown_faces')
            .select('id, representative_photo_id, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json({ unknown_faces: data });
    } catch (error) {
        console.error('getUnknownFaces error:', error);
        res.status(500).json({ error: 'Failed to get unknown faces' });
    }
};