import { supabase } from '../supabase/supabaseClient.js'

export const getDescription = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('photos')
            .select('*');
            
        if (error) throw error;
        console.log(data);
        res.json(data);
    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ error: error.message });
    }
}

export const addDescription = async(req, res) => {
    try {
        const { description } = req.body;
        console.log('Received description:', description);

        const { data, error } = await supabase
            .from('photos')
            .insert({ description })

        if (error) throw error;

        res.status(201).json({ message: 'Inserted successfully', data });
    } catch (error) {
        console.error('Insert error:', error);
        res.status(500).json({ error: error.message });
    }
}