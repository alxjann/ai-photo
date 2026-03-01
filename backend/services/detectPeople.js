import { computeFaces, matchDescriptors } from './ai/faceRecognition.js';

export const detectPeople = async (user, supabase, imageBuffer) => {
    const faces = await computeFaces(imageBuffer);
    if (!faces.length) return { matched: [], faces };

    const { data: people } = await supabase
        .from('people')
        .select('name, descriptors')
        .eq('user_id', user.id);

    if (!people || !people.length) return { matched: [], faces };

    const descriptors = faces.map(f => f.descriptor);
    const matched = await matchDescriptors(descriptors, people);
    return { matched, faces };
};