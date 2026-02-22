import { openai } from '../../config/ai.config.js';

export const generateEmbedding = async (text) => {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: text,
    });

    return response.data[0].embedding;
};