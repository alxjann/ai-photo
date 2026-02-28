import { computeDescriptors, matchDescriptors } from './ai/faceRecognition.js';

export const detectPeople = async (user, supabase, imageBuffer) => {
    const { data: people } = await supabase
        .from('people')
        .select('name, descriptors')
        .eq('user_id', user.id);

    if (!people || !people.length) return [];

    const queryDescriptors = await computeDescriptors(imageBuffer);
    if (!queryDescriptors.length) return [];

    return matchDescriptors(queryDescriptors, people);
};