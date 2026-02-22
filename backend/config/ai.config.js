import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import dotenv from "dotenv";

dotenv.config();

const endpoint = "https://models.github.ai/inference";

export const aiClient = ModelClient(endpoint, new AzureKeyCredential(process.env.GPT_TOKEN));