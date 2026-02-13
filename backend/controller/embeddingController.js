import { generateEmbedding } from "../services/ai/generateEmbedding.js";

export const generateEmbeddingController = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text)
            return res.status(400).json({ error: "no text provided"})

        const embedding = await generateEmbedding(text);

        res.status(200).json({
            message: "embedding generated successfully"
        });
    } catch (error) {
        console.error("error:", error);
        res.status(500).json({ error: "failed to generate embedding" });
    }
}