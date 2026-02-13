import { supabase } from '../config/supabase.js';
import { generateEmbedding } from '../services/ai/generateEmbedding.js';

export const searchImagesController = async (req, res) => {
    try {
        const { query } = req.body;

        if (!query || query.trim() === '') {
            const { data, error } = await supabase
                .from('photo')
                .select('id, image_data, descriptive, literal, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log(`📥 Returning all ${data?.length || 0} photos`);

            return res.status(200).json({
                results: data,
                message: 'All images returned'
            });
        }

        console.log('🔍 Search query:', query);

        const queryEmbedding = await generateEmbedding(query);
        console.log('✅ Query embedding generated (dimension:', queryEmbedding.length, ')');
        
        const { data: descriptiveResults, error: descError } = await supabase.rpc(
            'match_descriptive_photos',
            {
                query_embedding: queryEmbedding,
                match_threshold: 0.3,
                match_count: 20
            }
        );

        if (descError) {
            console.error('Descriptive search error:', descError);
            throw descError;
        }

        console.log(`Descriptive results: ${descriptiveResults?.length || 0} matches`);

        // Search literal embeddings
        const { data: literalResults, error: litError } = await supabase.rpc(
            'match_literal_photos',
            {
                query_embedding: queryEmbedding,
                match_threshold: 0.3,
                match_count: 20
            }
        );

        if (litError) {
            console.error('Literal search error:', litError);
            throw litError;
        }

        console.log(`📊 Literal results: ${literalResults?.length || 0} matches`);

        const allResults = [...(descriptiveResults || []), ...(literalResults || [])];
        const uniqueResults = Array.from(
            new Map(allResults.map(item => [item.id, item])).values()
        );
        uniqueResults.sort((a, b) => b.similarity - a.similarity);

        console.log(`Total unique results: ${uniqueResults.length}`);

        res.status(200).json({
            results: uniqueResults,
            query: query,
            count: uniqueResults.length
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            error: 'Search failed',
            details: error.message 
        });
    }
};