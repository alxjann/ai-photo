import { supabase } from '../config/supabase.js';

export const getAllPhotosController = async (req, res) => {
    try {
        console.log('📥 Loading all photos from database...');
        
        // ✅ Select all fields including image_data
        // But we won't log the actual data to avoid console flooding
        const { data, error } = await supabase
            .from('photo')
            .select('id, image_data, descriptive, literal, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Database error:', error);
            throw error;
        }

        console.log(`✅ Found ${data?.length || 0} photos in database`);
        // ✅ Don't log the actual data - it contains base64 images!

        res.status(200).json({
            success: true,
            count: data?.length || 0,
            results: data || [],
        });

    } catch (error) {
        console.error('❌ Error fetching photos:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch photos',
            details: error.message 
        });
    }
};