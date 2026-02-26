import Replicate from "replicate";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const replicateApiToken = process.env.REPLICATE_API_TOKEN;
if (!replicateApiToken) {
  throw new Error("Missing REPLICATE_API_TOKEN in backend/.env");
}

const replicate = new Replicate({
  auth: replicateApiToken,
});

export const textEmbedding = async (text) => {
  if (!text || !text.trim()) {
    throw new Error("textEmbedding requires non-empty text");
  }

  const output = await replicate.run("openai/clip", {
    input: {
      text: text.trim(),
    },
  });

  if (!output?.embedding || !Array.isArray(output.embedding)) {
    throw new Error("Invalid text embedding response from model");
  }

  return output.embedding;
};
