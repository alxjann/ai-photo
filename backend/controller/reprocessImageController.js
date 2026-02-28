import { reprocessPhoto } from '../services/reprocessPhoto.js';

export const reprocessImageController = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Image file required for reprocessing' });
        }

        const photo = await reprocessPhoto({
            supabase: req.supabase,
            userId: req.user.id,
            photoId: req.params.id,
            fileBuffer: req.file.buffer,
        });

        res.json({ message: 'Photo reprocessed successfully', photo });

    } catch (err) {
        console.error('Reprocess error:', err);
        res.status(err.status ?? 500).json({ error: err.message });
    }
};