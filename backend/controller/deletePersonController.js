import { getClientAuthToken } from '../utils/getClientAuthToken.js';

export const deletePersonController = async (req, res) => {
    try {
        const supabase = getClientAuthToken(req, res);
        if (!supabase) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const { error } = await supabase
            .from('people')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', user.id);

        if (error) throw error;
        res.status(200).json({ message: 'Person deleted' });
    } catch (error) {
        console.error('deletePerson error:', error);
        res.status(500).json({ error: 'Failed to delete person' });
    }
};