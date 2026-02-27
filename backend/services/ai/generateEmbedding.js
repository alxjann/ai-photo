import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import dotenv from 'dotenv';
dotenv.config();

const embeddingClient = ModelClient(
    "https://models.github.ai/inference",
    new AzureKeyCredential(process.env.VECTOR_TOKEN)
);

const embeddingModel = "openai/text-embedding-3-small";

export const generateEmbedding = async (text) => {
    const start = Date.now();
    const response = await embeddingClient.path("/embeddings").post({
        body: {
            input: [text],
            model: embeddingModel,
        },
    });

    if (response.status === '429') {
        throw new Error('Embedding rate limit hit — try again shortly');
    }

    if (response.body?.error) {
        throw new Error(response.body.error.message || 'Embedding failed');
    }

    console.log(`generateEmbedding: completed in ${Date.now() - start}ms`);
    return response.body.data[0].embedding;
};