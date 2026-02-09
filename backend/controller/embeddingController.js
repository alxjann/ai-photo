import { generateEmbedding } from "../services/ai/generateEmbedding.js";

export const generateEmbeddingController = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text)
            return res.status(400).json({ error: "No text provided"})

        const embedding = await generateEmbedding(text);

        res.status(200).json({
            message: "Embedding generated successfully",
            data: embedding,
        });
    } catch (error) {
        console.error("Embedding error:", error);
        res.status(500).json({ error: "Failed to generate embedding" });
    }
}