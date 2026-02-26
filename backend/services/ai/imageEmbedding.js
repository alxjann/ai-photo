import Replicate from "replicate";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export const imageEmbedding = async (imageBuffer) => {
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error("imageEmbedding requires a non-empty image buffer");
  }

  const output = await replicate.run("openai/clip", {
    input: {
      image: imageBuffer,
    },
  });

  if (!output?.embedding || !Array.isArray(output.embedding)) {
    throw new Error("Invalid image embedding response from model");
  }

  return output.embedding;
};
