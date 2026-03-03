import OpenAI from "openai";
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, 
});

const embeddingModel = "text-embedding-3-small";

export const generateEmbedding = async (text) => {
    const start = Date.now();

    try {
        const response = await openai.embeddings.create({
            model: embeddingModel,
            input: text,
            encoding_format: "float",
        });

        console.log(`generateEmbedding: completed in ${Date.now() - start}ms`);

        return response.data[0].embedding;

    } catch (error) {
        if (error.status === 429) {
            throw new Error('Embedding rate limit hit — try again shortly');
        }
        
        throw new Error(error.message || 'Embedding failed');
    }
};