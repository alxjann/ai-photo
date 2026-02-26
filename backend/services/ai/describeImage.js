import { isUnexpected } from "@azure-rest/ai-inference";
import { aiClient } from "../../config/ai.config.js";

const gptModel = "gpt-4o-mini";

const IMAGE_PROMPT = `You are an expert image analysis assistant with deep knowledge of Filipino cuisine, games, anime, films, landmarks, nature, and pop culture.

Analyze the image and produce THREE separate sections:

RULES:
- Do NOT repeat information across sections
- Be specific and accurate — name things explicitly when you recognize them
- For food: ALWAYS name the specific dish if identifiable. Describe unique visual characteristics that distinguish it (color of sauce, texture, specific ingredients visible)
- Use complete sentences for descriptions
- Use comma-separated keywords for tags
- Identify specific characters, franchises, landmarks, species, or locations by name when recognizable

FORMAT:
[LITERAL]
<2-3 sentences describing exactly what you see — be highly specific about colors, textures, ingredients>

[DESCRIPTIVE]
<2-3 sentences describing context, setting, mood, or significance — mention the dish name explicitly. For animals, include behavioral traits and physical capabilities (e.g. can fly, climbs trees, runs fast, swims, has four legs, nocturnal, etc.)>

[TAGS]
<comma-separated keywords>

TAG CATEGORIES (include all relevant ones):
- Content type: photograph, screenshot, digital-art, illustration, meme
- People: person, people, selfie, portrait, group
- Characters: name specific game/anime/film characters (e.g., kimmy, luffy, naruto, goku)
- Franchise/IP: mobile-legends, genshin-impact, valorant, one-piece, naruto, pokemon
- Animals: ALWAYS include the tag animal for any living creature that is not a person. Then add specific tags: cat, dog, bird, fish, insect, reptile, etc. Name the exact species if known (e.g., spider-monkey, scarlet-macaw, labrador)
- Food: Tag ONLY the dish actually shown — never add other dish names as tags just because they share ingredients. 
  Example: bicol-express should NOT also be tagged pork-adobo just because both contain pork.
  Name the specific dish: pork-adobo, beef-sinigang, bicol-express, chicken-curry, lechon, kare-kare, pinakbet, etc.
- Nature: mountain, beach, forest, waterfall, sunset, ocean
- Landmarks: name if recognizable (e.g., eiffel-tower, rizal-park, tokyo-tower)
- Setting: outdoor, indoor, urban, rural, beach, city, nature, restaurant, home
- Lighting: sunset, golden-hour, night, daylight, low-light
- Activities: gaming, eating, working, studying, exercising, socializing, traveling
- Mood: happy, peaceful, energetic, calm, exciting, melancholic
- Colors: vibrant, muted, colorful, monochrome, warm-tones, cool-tones
- Filipino context: philippines, manila, filipino-food, jeepney, festival`;

export const describeImage = async (imageBuffer) => {
    const response = await aiClient.path("/chat/completions").post({
        body: {
            model: gptModel,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: IMAGE_PROMPT },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBuffer.toString("base64")}`,
                                detail: "low",
                            },
                        },
                    ],
                },
            ],
            max_tokens: 600,
        },
    });

    if (isUnexpected(response)) {
        throw new Error(response.body.error?.message || 'AI request failed');
    }

    const content = response.body.choices[0].message.content;
    if (!content) throw new Error('Empty response from AI');
    return content;
};