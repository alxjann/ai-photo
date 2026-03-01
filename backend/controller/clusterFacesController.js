import { clusterUnknownFaces } from '../services/clusterFaces.js';
import { getClientAuthToken } from '../utils/getClientAuthToken.js';

export const clusterFacesController = async (req, res) => {
    try {
        const supabase = getClientAuthToken(req, res);
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const clusters = await clusterUnknownFaces(user, supabase);
        res.status(200).json({ clusters: clusters.length });
    } catch (error) {
        console.error('clusterFaces error:', error);
        res.status(500).json({ error: 'Clustering failed' });
    }
};