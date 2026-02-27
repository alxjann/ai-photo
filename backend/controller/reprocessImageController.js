import { describeImage } from '../services/ai/describeImage.js';
import { generateEmbedding } from '../services/ai/generateEmbedding.js';
import { getClientAuthToken } from '../utils/getClientAuthToken.js';
import { enrichTagsWithConceptNet } from '../services/conceptEnrichment.js';
import { getCompressedImageBuffer } from '../utils/compressImage.js';
import fetch from 'node-fetch';

const AI_REFUSAL_PHRASES = [
    "i'm unable", "i am unable", "i'm sorry", "i am sorry",
    "i can't analyze", "i cannot analyze", "i can't assist",
    "i cannot assist", "i'm not able", "please provide",
    "no identifiable content",
];

function validateAIResponse(description) {
    const lower = description.toLowerCase();
    if (!description.includes('[LITERAL]') ||
        !description.includes('[DESCRIPTIVE]') ||
        !description.includes('[TAGS]')) {
        throw new Error('AI_INVALID_RESPONSE: Missing required sections');
    }
    if (AI_REFUSAL_PHRASES.some(p => lower.includes(p))) {
        throw new Error('AI_REFUSED');
    }
    const literalStart = description.indexOf('[LITERAL]');
    const descriptiveStart = description.indexOf('[DESCRIPTIVE]');
    const tagsStart = description.indexOf('[TAGS]');
    const literal = description.substring(literalStart + 9, descriptiveStart).trim();
    const descriptive = description.substring(descriptiveStart + 13, tagsStart).trim();
    const tags = description.substring(tagsStart + 6).trim();
    if (literal.length < 20) throw new Error('AI_INVALID_RESPONSE: Literal too short');
    if (descriptive.length < 20) throw new Error('AI_INVALID_RESPONSE: Descriptive too short');
    if (tags.length < 5) throw new Error('AI_INVALID_RESPONSE: Tags too short');
    return { literal, descriptive, tags };
}

export const reprocessImageController = async (req, res) => {
    try {
        const supabase = getClientAuthToken(req, res);
        if (!supabase) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const { id } = req.params;

        const { data: photo, error: fetchError } = await supabase
            .from('photo')
            .select('id, device_asset_id, user_id, manual_description')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !photo) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Image file required for reprocessing' });
        }

        const compressedImage = await getCompressedImageBuffer(req.file.buffer);

        let parsed;
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const description = await describeImage(compressedImage);
                parsed = validateAIResponse(description);
                break;
            } catch (err) {
                if (attempt === 2) throw err;
                console.warn(`Reprocess attempt ${attempt} failed, retrying...`);
            }
        }

        let { literal, descriptive, tags } = parsed;

        tags = await enrichTagsWithConceptNet(supabase, tags.toLowerCase());

        if (photo.manual_description) {
            descriptive = `${descriptive} User note: ${photo.manual_description}`;
        }

        const descriptiveEmbedding = await generateEmbedding(descriptive);
        const literalEmbedding = await generateEmbedding(literal);

        const { data: updated, error: updateError } = await supabase
            .from('photo')
            .update({
                descriptive,
                literal,
                tags,
                descriptive_embedding: descriptiveEmbedding,
                literal_embedding: literalEmbedding,
                needs_reprocessing: false,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (updateError) throw updateError;

        res.status(200).json({ message: 'Photo reprocessed successfully', photo: updated });

    } catch (error) {
        console.error('reprocessImageController error:', error);
        res.status(500).json({ error: 'Failed to reprocess image' });
    }
};