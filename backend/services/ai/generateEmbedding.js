import { isUnexpected } from "@azure-rest/ai-inference";
import { aiClient } from "../../config/ai.config.js";

const embeddingModel = "openai/text-embedding-3-large";

export const generateEmbedding = async(text) => {
    const response = await aiClient.path("/embeddings").post({
        body: {
            input: [text],
            model: embeddingModel,
        },
    });

    if (isUnexpected(response)) {
        throw response.body.error;
    }

    return response.body.data[0].embedding;
}