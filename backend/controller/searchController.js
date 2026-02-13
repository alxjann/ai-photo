import { supabase } from '../config/supabase.js';
import { generateEmbedding } from '../services/ai/generateEmbedding.js';

export const searchImagesController = async (req, res) => {
    try {
        const { 
            query, 
            fullTextWeight = 1.0,
            semanticWeight = 1.0,
            rrfK = 50
        } = req.body;

        if (!query || query.trim() === '') {
            const { data, error } = await supabase
                .from('photo')
                .select('id, image_data, descriptive, literal, tags, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return res.status(200).json({
                results: data,
                message: 'All images returned',
                searchType: 'all'
            });
        }

        const queryEmbedding = await generateEmbedding(query);
        
        const { data: results, error } = await supabase.rpc(
            'hybrid_search_photos',
            {
                query_text: query,
                query_embedding: queryEmbedding,
                match_count: 20,
                full_text_weight: fullTextWeight,
                semantic_weight: semanticWeight,
                rrf_k: rrfK
            }
        );

        if (error) throw error;

        res.status(200).json({
            results: results,
            query: query,
            count: results?.length || 0,
            searchType: 'hybrid',
            weights: { 
                fullText: fullTextWeight, 
                semantic: semanticWeight 
            }
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            error: 'Search failed',
            details: error.message 
        });
    }
};