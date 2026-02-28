import { registerPerson } from '../services/registerPerson.js';
import { getClientAuthToken } from '../utils/getClientAuthToken.js';

export const registerPersonController = async (req, res) => {
    try {
        const supabase = getClientAuthToken(req, res);
        if (!supabase) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return res.status(401).json({ error: 'Unauthorized' });
        if (!req.file) return res.status(400).json({ error: 'No image provided' });

        const { name } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

        const result = await registerPerson(user, supabase, req.file.buffer, name.trim());
        res.status(200).json({ message: 'Person registered', person: result });
    } catch (error) {
        if (error.message === 'NO_FACE_DETECTED') {
            return res.status(422).json({ error: 'No face detected in this photo. Try a clearer front-facing photo.' });
        }
        console.error('registerPerson error:', error);
        res.status(500).json({ error: 'Failed to register person' });
    }
};