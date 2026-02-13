import { supabase } from '../config/supabase.js';
import { generateEmbedding } from '../services/ai/generateEmbedding.js';

export const searchImagesController = async (req, res) => {
    try {
        const { query } = req.body;

        if (!query || query.trim() === '') {
            // no query, return all images
            const { data, error } = await supabase
                .from('photo')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return res.status(200).json({
                results: data,
                message: 'All images returned'
            });
        }

        console.log('🔍 Search query:', query);

        // embedding
        const queryEmbedding = await generateEmbedding(query);
        console.log('query embedding generated');
        
        // search
        const { data: descriptiveResults, error: descError } = await supabase.rpc(
            'match_descriptive_photos',
            {
                query_embedding: queryEmbedding,
                match_threshold: 0.5,
                match_count: 20
            }
        );

        if (descError) {
            console.error('search error:', descError);
            throw descError;
        }

        //litera; 
        const { data: literalResults, error: litError } = await supabase.rpc(
            'match_literal_photos',
            {
                query_embedding: queryEmbedding,
                match_threshold: 0.5,
                match_count: 20
            }
        );

        if (litError) {
            console.error('Literal search error:', litError);
            throw litError;
        }
        const allResults = [...descriptiveResults, ...literalResults];
        const uniqueResults = Array.from(
            new Map(allResults.map(item => [item.id, item])).values()
        );
        uniqueResults.sort((a, b) => b.similarity - a.similarity);

        console.log(`Found ${uniqueResults.length} matching images`);

        res.status(200).json({
            results: uniqueResults,
            query: query,
            count: uniqueResults.length
        });

    } catch (error) {
        console.error('error:', error);
        res.status(500).json({ 
            error: 'Search failed',
            details: error.message 
        });
    }
};