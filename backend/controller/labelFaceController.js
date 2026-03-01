import { labelUnknownFace } from '../services/clusterFaces.js';
import { getClientAuthToken } from '../utils/getClientAuthToken.js';

export const labelFaceController = async (req, res) => {
    try {
        const supabase = getClientAuthToken(req, res);
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const { name } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

        const result = await labelUnknownFace(user, supabase, req.params.id, name.trim());
        res.status(200).json({ message: 'Face labeled', ...result });
    } catch (error) {
        console.error('labelFace error:', error);
        res.status(500).json({ error: 'Failed to label face' });
    }
};