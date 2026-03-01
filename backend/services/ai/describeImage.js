import { isUnexpected } from "@azure-rest/ai-inference";
import { aiClient } from "../../config/ai.config.js";

const gptModel = "gpt-4o-mini";

const IMAGE_PROMPT = `You are an expert image analysis assistant with deep knowledge of global cuisine, games, anime, films, landmarks, nature, and pop culture.

Analyze the image and produce THREE separate sections:

RULES:
- Do NOT repeat information across sections
- Be specific and accurate — name things explicitly when you recognize them
- For food: ALWAYS name the specific dish if identifiable. Describe unique visual characteristics that distinguish it (color of sauce, texture, specific ingredients visible)
- For people: describe their appearance, expression, pose, and what they appear to be doing
- Use complete sentences for descriptions
- Use comma-separated keywords for tags
- Identify specific characters, franchises, landmarks, species, or locations by name when recognizable

FORMAT:
[LITERAL]
<2-3 sentences describing exactly what you see — people, objects, colors, textures, setting>

[DESCRIPTIVE]
<2-3 sentences describing context, mood, what people are doing, or the significance of the scene>

[TAGS]
<comma-separated keywords>

TAG CATEGORIES (include all relevant ones):
- Content type: photograph, screenshot, digital-art, illustration, meme
- People: person, people, selfie, portrait, group
- Appearance: smiling, laughing, serious, crying, surprised, eyes-closed
- Activities: gaming, eating, working, studying, exercising, socializing, traveling, cooking, reading, dancing, singing
- Characters: name specific game/anime/film characters (e.g., kimmy, luffy, naruto, goku)
- Franchise/IP: mobile-legends, genshin-impact, valorant, one-piece, naruto, pokemon
- Animals: ALWAYS include "animal" tag for ANY creature, PLUS the specific species (e.g. animal, clownfish; animal, eagle; animal, dog, labrador)
- Food: Tag ONLY the dish actually shown — name the specific dish from ANY cuisine worldwide (e.g. pork-adobo, ramen, pizza, biryani, tacos, sushi, pasta, burger, pad-thai, shawarma, etc.)
- Nature: mountain, beach, forest, waterfall, sunset, ocean
- Landmarks: name if recognizable (e.g., eiffel-tower, rizal-park, tokyo-tower, times-square)
- Setting: outdoor, indoor, urban, rural, beach, city, nature, restaurant, home, school, gym, office
- Background objects: ALWAYS tag significant background elements (e.g. gate, fence, wall, door, window, tree, car, table, chair)
- Lighting: sunset, golden-hour, night, daylight, low-light
- Mood: happy, peaceful, energetic, calm, exciting, melancholic, funny, romantic
- Colors: vibrant, muted, colorful, monochrome, warm-tones, cool-tones`;

const SCENE_FALLBACK_PROMPT = `You are a photo scene analyzer. Describe this image focusing on the scene, setting, and visible people's actions and expressions — but do NOT identify or name any individuals.

Produce THREE sections:

FORMAT:
[LITERAL]
<2-3 sentences describing what you see — people's expressions, poses, what they're doing, plus the setting, background, colors, and lighting>

[DESCRIPTIVE]
<2-3 sentences describing the mood, atmosphere, and context of the scene>

[TAGS]
<comma-separated keywords for expressions, activities, setting, mood, lighting, colors, background objects>

Examples of expression/activity tags: smiling, laughing, eating, studying, gaming, exercising, posing, sitting, standing, hugging`;

const callGPT = async (prompt, imageBuffer) => {
    const response = await aiClient.path("/chat/completions").post({
        body: {
            model: gptModel,
            messages: [{
                role: "user",
                content: [
                    { type: "text", text: prompt },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${imageBuffer.toString("base64")}`,
                            detail: "low",
                        },
                    },
                ],
            }],
            max_tokens: 600,
        },
    });

    if (isUnexpected(response)) throw new Error(response.body.error?.message || 'AI request failed');
    return response.body.choices[0].message.content || '';
};

const isRefusal = (text) => !text.includes('[LITERAL]') || !text.includes('[DESCRIPTIVE]') || !text.includes('[TAGS]');

export const describeImage = async (imageBuffer) => {
    const start = Date.now();
    console.log('describeImage: sending request to GPT...');

    let content = await callGPT(IMAGE_PROMPT, imageBuffer);

    if (isRefusal(content)) {
        console.log('describeImage: GPT refused, trying scene fallback...');
        content = await callGPT(SCENE_FALLBACK_PROMPT, imageBuffer);
    }

    console.log(`describeImage: GPT responded in ${Date.now() - start}ms`);
    console.log('describeImage response:\n', content);

    return content;
};