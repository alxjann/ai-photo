import OpenAI from "openai";
import { encoding_for_model } from "tiktoken";
import dotenv from 'dotenv';

dotenv.config();

const gptModel = "gpt-4.1-mini";
const embeddingModel = "text-embedding-3-small";

const IMAGE_PROMPT = `
You are an expert image analysis assistant with deep knowledge of Filipino cuisine, games, anime, films, landmarks, nature, and pop culture.
Analyze the image and produce THREE separate sections. If the image is low resolution or unclear, do your best to describe what you can see â€” never respond with "I don't know" or refuse to analyze:

RULES:
- Do NOT repeat information across sections
- Be specific and accurate â€” name things explicitly when you recognize them
- For food: ALWAYS name the specific dish if identifiable. Describe unique visual characteristics that distinguish it (color of sauce, texture, specific ingredients visible)
- Use complete sentences for descriptions
- Use comma-separated keywords for tags
- Identify specific characters, franchises, landmarks, species, or locations by name when recognizable
- For [CATEGORY]: only assign a category if the main subject of the image clearly and directly belongs to it. If the image shows an object, device, text, screenshot, or anything that does not fit Food, Nature, Animals, People, or Travel â€” leave [CATEGORY] completely empty.

FORMAT:
[LITERAL]
<2-3 sentences describing exactly what you see â€” be highly specific about colors, textures, ingredients, animal breed>

[DESCRIPTIVE]
<2-3 sentences describing context, setting, mood, or significance â€” mention the dish name explicitly>

[TAGS]
<comma-separated keywords>

TAG CATEGORIES (include all relevant ones):
- Content type: photograph, screenshot, digital-art, illustration, meme
- People: person, people, selfie, portrait, group
- Characters: name specific game/anime/film characters (e.g., kimmy, luffy, naruto, goku)
- Franchise/IP: mobile-legends, genshin-impact, valorant, one-piece, naruto, pokemon
- Animals: ALWAYS include "animal" tag for ANY creature, PLUS the specific species (e.g. animal, clownfish; animal, eagle; animal, dog, labrador)
- Food: Tag ONLY the dish actually shown â€” never add other dish names as tags just because they share ingredients.
  Name the specific dish: pork-adobo, beef-sinigang, bicol-express, chicken-curry, lechon, kare-kare, pinakbet, etc.
- Nature: mountain, beach, forest, waterfall, sunset, ocean
- Landmarks: name if recognizable (e.g., eiffel-tower, rizal-park, tokyo-tower)
- Setting: outdoor, indoor, urban, rural, beach, city, nature, restaurant, home
- Background objects: ALWAYS tag significant background elements (e.g. gate, fence, wall, door, window, tree, car, table, chair)
- Lighting: sunset, golden-hour, night, daylight, low-light
- Activities: gaming, eating, working, studying, exercising, socializing, traveling
- Mood: happy, peaceful, energetic, calm, exciting, melancholic
- Colors: vibrant, muted, colorful, monochrome, warm-tones, cool-tones
- Filipino context: philippines, manila, filipino-food, jeepney, festival

[CATEGORY]
<comma-separated list of ONLY strongly applicable categories. Omit any category that does not clearly apply. A single photo CAN have multiple categories. It is perfectly fine to return 'none' value here if none of the 5 categories fit.

Categories and when to use them:
- Food -> main subject is a recognizable food item or dish
- Nature -> main subject is a landscape, plant, sky, body of water, or natural environment
- Animals -> main subject is an animal or creature of any kind
- People -> main subject is a person or group of people (real, not illustrated); does NOT apply if people are merely visible in the background or periphery but are not the primary focus
- Travel -> main subject is a recognizable landmark, tourist destination, or travel location
- None
`;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const enc = encoding_for_model("gpt-4o-mini");
const tokens = enc.encode(IMAGE_PROMPT);
console.log("IMAGE_PROMPT tokens:", tokens.length);
enc.free();

export const generateEmbedding = async (text, retries = 3) => {
    const start = Date.now();

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await openai.embeddings.create({
                model: embeddingModel,
                input: text,
                encoding_format: "float",
            });

            console.log(`generateEmbedding: completed in ${Date.now() - start}ms`);
            return response.data[0].embedding;

        } catch (error) {
            if (error.status === 429 && attempt < retries) {
                const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
                console.warn(`generateEmbedding: rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
                await new Promise(res => setTimeout(res, delay));
                continue;
            }
            throw new Error(error.message || 'Embedding failed');
        }
    }
};

export const describeImage = async (imageBuffer) => {
    const start = Date.now();
    console.log('describeImage: sending request to OpenAI...');

    try {
        const response = await openai.chat.completions.create({
            model: gptModel,
            store: true,
            messages: [
                {
                    role: "system",
                    content: IMAGE_PROMPT
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBuffer.toString("base64")}`,
                                detail: "high",
                            },
                        },
                    ],
                },
            ],
            max_tokens: 600,
        });

        const { prompt_tokens, completion_tokens, total_tokens } = response.usage;
        console.log(response.usage)
        const cached = response.usage.prompt_tokens_details?.cached_tokens ?? 0;  // â† check cache hits
        console.log(`describeImage: Success in ${Date.now() - start}ms | tokens â€” prompt: ${prompt_tokens} (cached: ${cached}), completion: ${completion_tokens}, total: ${total_tokens}`);

        const content = response.choices[0].message.content;
        if (!content) throw new Error('Empty response from AI');

        return content;

    } catch (error) {
        if (error.status === 429) {
            console.error('Rate limit hit for GPT-4o-mini');
            throw new Error('Image analysis rate limit hit â€” try again shortly');
        }

        console.error('OpenAI Error:', error.message);
        throw new Error(error.message || 'Image description failed');
    }
};