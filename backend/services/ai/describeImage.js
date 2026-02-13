import { isUnexpected } from "@azure-rest/ai-inference";
import { aiClient } from "../../config/ai.config.js";

const gptModel = "gpt-4o-mini";

const IMAGE_PROMPT = `You are an image understanding assistant.

Analyze the image and produce THREE separate sections:

RULES:
- Do NOT repeat information across sections
- Be specific and accurate
- Use complete sentences for descriptions
- Use comma-separated keywords for tags

FORMAT:
[LITERAL]
<2 sentences describing exactly what you see>

[DESCRIPTIVE]
<2 sentences describing context, setting, mood, and story>

[TAGS]
<comma-separated keywords>

TAG CATEGORIES (include relevant ones):
- Content type: photograph, screenshot, digital-art, 3d-render, illustration, meme
- Objects: person, people, food, building, vehicle, animal, device
- Setting: outdoor, indoor, beach, city, nature, restaurant, home
- Lighting: sunset, sunrise, golden-hour, night, daylight, artificial
- Activities: gaming, eating, working, studying, exercising, socializing
- Mood: happy, peaceful, energetic, calm, exciting
- Colors: vibrant, muted, colorful, monochrome, warm-tones, cool-tones

EXAMPLES:

IMAGE: Someone playing Fortnite
[LITERAL]
A first-person view showing a virtual character holding a weapon in a colorful game environment. The interface displays health bars, ammunition count, and a minimap.

[DESCRIPTIVE]
An intense gaming session in a popular battle royale game. The vibrant graphics and UI elements suggest active gameplay in a competitive multiplayer match.

[TAGS]
screenshot, video-game, fortnite, gaming, battle-royale, hud-visible, first-person-shooter, multiplayer, virtual-environment

IMAGE: Beach sunset photo
[LITERAL]
A smartphone photo of a beach during sunset with waves and an orange sky. Two silhouettes of people are visible against the sunset.

[DESCRIPTIVE]
A peaceful moment captured at the beach during golden hour. The warm colors and tranquil scene suggest a relaxing vacation or evening walk.

[TAGS]
photograph, outdoor, beach, sunset, golden-hour, ocean, people, silhouette, vacation, peaceful, warm-tones, natural-lighting
`;

export const describeImage = async (imageBuffer) => {
    try {
        console.log('🤖 Sending request to AI model:', gptModel);
        
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

        console.log('📥 Response status:', response.status);
        
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
    } catch (error) {
        console.error('describeImage:', error);
        console.error('erordetails:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        throw error;
    }
};