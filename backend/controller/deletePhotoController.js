import { supabase } from '../config/supabase.js';

export const deletePhotoController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Photo ID is required' });
        }

        console.log('Deleting photo:', id);

        const { error } = await supabase
            .from('photo')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Delete error:', error);
            throw error;
        }

        console.log('Photo deleted successfully');

        res.status(200).json({
            message: 'Photo deleted successfully',
            id: id
        });

    } catch (error) {
        console.error('Delete photo error:', error);
        res.status(500).json({
            error: 'Failed to delete photo',
            details: error.message
        });
    }
};
