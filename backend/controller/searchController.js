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
        .select('id, thumbnail_data, descriptive, literal, tags, created_at')
        .order('created_at', { ascending: false });

         if (error) throw error;

        return res.status(200).json({
        results: data,
        message: 'All images returned',
        searchType: 'all'
      });
}

        console.log('=== SEARCH DEBUG ===');
        console.log('Query:', query);
        console.log('Weights - FTS:', fullTextWeight, 'Semantic:', semanticWeight);

        const queryEmbedding = await generateEmbedding(query);
        console.log('Embedding generated, dimension:', queryEmbedding.length);
        
        const { data: results, error } = await supabase.rpc(
            'hybrid_search_photos',
            {
                query_text: query,
                query_embedding: queryEmbedding,
                match_count: 20,
                full_text_weight: fullTextWeight,
                semantic_weight: semanticWeight,
                rrf_k: rrfK,
                min_score: 0.025
            }
        );

        if (error) throw error;

        console.log('Total results:', results?.length || 0);
        
        if (results && results.length > 0) {
            console.log('=== TOP 5 RESULTS ===');
            results.slice(0, 5).forEach((r, i) => {
                console.log(`${i + 1}.`, {
                    id: r.id.substring(0, 8),
                    fts_rank: r.fts_rank.toFixed(4),
                    semantic_rank: r.semantic_rank.toFixed(4),
                    final_score: r.final_score.toFixed(4),
                    tags: r.tags?.substring(0, 60)
                });
            });
        }
        console.log('===================');

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