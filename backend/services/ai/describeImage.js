import { isUnexpected } from "@azure-rest/ai-inference";
import { aiClient } from "../../config/ai.config.js";

const gptModel = "gpt-4o-mini";

const IMAGE_PROMPT = `You are an image understanding assistant.

Analyze the image and produce TWO separate descriptions (2 sentences for each description).

RULES:
- Do NOT repeat information across descriptions.
- Do NOT include interpretations in the Literal description.
- Do NOT mention emotions in the Literal description.
- Use complete sentences.
- Keep each description concise but information-dense.
- Output MUST strictly follow the format below.

FORMAT:
[LITERAL]
<text>

[DESCRIPTIVE]
<text>
`;

export const describeImage = async (imageBuffer) => {
    console.log('Sending request to AI model:', gptModel);
    
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

    console.log('Response status:', response.status);
    
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