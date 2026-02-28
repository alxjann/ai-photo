import { computeDescriptors } from './ai/faceRecognition.js';
import { getCompressedImageBuffer } from '../utils/compressImage.js';

export const registerPerson = async (user, supabase, imageBuffer, name) => {
    const compressed = await getCompressedImageBuffer(imageBuffer);
    const descriptors = await computeDescriptors(compressed);

    if (!descriptors.length) throw new Error('NO_FACE_DETECTED');

    const { data: existing } = await supabase
        .from('people')
        .select('id, descriptors')
        .eq('user_id', user.id)
        .eq('name', name.toLowerCase())
        .maybeSingle();

    if (existing) {
        const merged = [...existing.descriptors, ...descriptors];
        const { data, error } = await supabase
            .from('people')
            .update({ descriptors: merged })
            .eq('id', existing.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    const { data, error } = await supabase
        .from('people')
        .insert({ user_id: user.id, name: name.toLowerCase(), descriptors })
        .select()
        .single();

    if (error) throw error;
    return data;
};