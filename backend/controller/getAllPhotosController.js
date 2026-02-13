import { supabase } from '../config/supabase.js';

export const getAllPhotosController = async (req, res) => {
    try {
        console.log('loading all photos from database...');
        
        const { data, error } = await supabase
            .from('photo')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('error:', error);
            throw error;
        }

        console.log(`Found ${data?.length || 0} photos in database`);
        console.log('Photos:', JSON.stringify(data, null, 2));

        res.status(200).json({
            success: true,
            count: data?.length || 0,
            results: data || [],
        });

    } catch (error) {
        console.error('error:', error);
        res.status(500).json({ 
            success: false,
            error: 'fail to fetch photos',
            details: error.message 
        });
    }
};