import { isUnexpected } from "@azure-rest/ai-inference";
import { aiClient } from "../../config/ai.config.js";

const gptModel = "gpt-4o";

const IMAGE_PROMPT = `You are an expert image analysis assistant with deep knowledge of games, anime, films, landmarks, nature, and pop culture.

Analyze the image and produce THREE separate sections:

RULES:
- Do NOT repeat information across sections
- Be specific and accurate — name things explicitly when you recognize them
- Use complete sentences for descriptions
- Use comma-separated keywords for tags
- Identify specific characters, franchises, landmarks, species, or locations by name when recognizable

FORMAT:
[LITERAL]
<2-3 sentences describing exactly what you see — objects, people, text, colors, composition>

[DESCRIPTIVE]
<2-3 sentences describing context, setting, mood, story, or significance>

[TAGS]
<comma-separated keywords>

TAG CATEGORIES (include all relevant ones):
- Content type: photograph, screenshot, digital-art, 3d-render, illustration, meme, film-still, anime
- People: person, people, selfie, portrait, group, crowd
- Characters: name specific game/anime/film characters (e.g., kimmy, layla, luffy, naruto, goku, batman)
- Franchise/IP: mobile-legends, genshin-impact, valorant, minecraft, one-piece, naruto, marvel, dc, pokemon
- Animals: cat, dog, bird, fish, wildlife — name the species if known
- Food & drink: name specific dishes (e.g., ramen, sinigang, pizza, coffee)
- Nature & landscape: mountain, beach, forest, waterfall, sunset, ocean, lake, desert, field
- Landmarks: name if recognizable (e.g., eiffel-tower, rizal-park, sm-mall, tokyo-tower)
- Setting: outdoor, indoor, urban, rural, beach, city, nature, restaurant, home, school, office
- Lighting: sunset, sunrise, golden-hour, night, daylight, artificial, low-light, backlit
- Activities: gaming, eating, working, studying, exercising, socializing, traveling, cooking, reading
- Mood: happy, peaceful, energetic, calm, exciting, melancholic, romantic, tense
- Colors: vibrant, muted, colorful, monochrome, warm-tones, cool-tones, pastel, dark
- Time: day, night, dusk, dawn
- Filipino context: philippines, manila, cebu, tagalog, filipino-culture, local-food, jeepney, festival

EXAMPLES:

IMAGE: Mobile Legends screenshot with Kimmy
[LITERAL]
A screenshot from Mobile Legends showing Kimmy, a marksman hero with a futuristic weapon, in the middle of a jungle fight. The HUD shows health bars, skill icons, and a minimap in the corner.

[DESCRIPTIVE]
An active ranked match moment captured during a jungle skirmish. The player is using Kimmy's signature energy cannon abilities in what appears to be a mid-game team fight.

[TAGS]
screenshot, mobile-legends, kimmy, gaming, mobile-game, marksman, battle, hud-visible, multiplayer, ranked, jungle

IMAGE: Sunset at the beach
[LITERAL]
A wide-angle photograph of a beach at sunset showing orange and pink sky reflecting on calm water. A silhouette of a person stands at the shoreline looking at the horizon.

[DESCRIPTIVE]
A serene, contemplative moment captured during golden hour at a tropical beach. The warm tones and lone figure evoke feelings of peace, solitude, and natural beauty.

[TAGS]
photograph, outdoor, beach, sunset, golden-hour, ocean, silhouette, person, peaceful, warm-tones, tropical, natural-lighting, travel

IMAGE: Plate of sinigang
[LITERAL]
A ceramic bowl of Filipino sinigang soup with pork ribs, kangkong leaves, radish, and eggplant in a clear tamarind broth. The dish is served on a wooden table.

[DESCRIPTIVE]
A classic Filipino home-cooked meal, sinigang is a beloved sour soup often enjoyed with steamed rice. The fresh vegetables and rich broth suggest a freshly prepared traditional dish.

[TAGS]
photograph, food, sinigang, filipino-food, soup, pork, tamarind, indoor, home, meal, local-food, philippines
`;

export const describeImage = async (imageBuffer) => {
    console.log('sending request to AI model:', gptModel);
    
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
                                detail: "auto",
                            },
                        },
                    ],
                },
            ],
        },
    });

    console.log('response: ', response.status);
    
    if (isUnexpected(response)) {
        console.error('Response body:', JSON.stringify(response.body, null, 2));
        throw new Error(response.body.error?.message || 'AI request failed');
    }

    if (!response.body || !response.body.choices || !response.body.choices[0]) {
        throw new Error('invalid ai response structure');
    }

    const content = response.body.choices[0].message.content;
    console.log('ai content received (length):', content?.length);
    
    return content;
};