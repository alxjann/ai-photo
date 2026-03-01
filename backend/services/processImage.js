import { getCompressedImageBuffer } from '../utils/compressImage.js';
import { describeImage } from './ai/describeImage.js';
import { generateEmbedding } from './ai/generateEmbedding.js';
import { detectPeople } from './detectPeople.js';

export const processImage = async (user, supabase, image, device_asset_id) => {
    const start = Date.now();
    if (!user || !user.id) throw new Error('Invalid user object or missing user.id');

    const compressedImage = await getCompressedImageBuffer(image);

    const { data: existing } = await supabase
        .from('photo')
        .select('id')
        .eq('user_id', user.id)
        .eq('device_asset_id', device_asset_id)
        .maybeSingle();

    if (existing) throw new Error('DUPLICATE_IMAGE');

    const [description, { matched: detectedPeople, faces }] = await Promise.all([
        describeImage(compressedImage),
        detectPeople(user, supabase, compressedImage),
    ]);

    const faceCount = faces.length;
    const faceDescriptors = faces.map(f => f.descriptor);

    const hasFormat = description.includes('[LITERAL]') &&
        description.includes('[DESCRIPTIVE]') &&
        description.includes('[TAGS]');

    let literal, descriptive, baseTags;

    if (hasFormat) {
        const literalStart = description.indexOf('[LITERAL]');
        const descriptiveStart = description.indexOf('[DESCRIPTIVE]');
        const tagsStart = description.indexOf('[TAGS]');
        literal = description.substring(literalStart + 9, descriptiveStart).trim();
        descriptive = description.substring(descriptiveStart + 13, tagsStart).trim();
        baseTags = description.substring(tagsStart + 6).trim().toLowerCase();
    } else {
        const names = detectedPeople.length ? detectedPeople.join(' and ') : 'someone';
        literal = `A personal photo featuring ${names}.`;
        descriptive = `A personal photo featuring ${names}.`;
        baseTags = 'person, people, selfie, portrait';
    }

    const peopleTags = detectedPeople.map(name => `person:${name}`).join(', ');
    const tags = peopleTags && !baseTags.includes('person:')
        ? `${baseTags}, ${peopleTags}`
        : baseTags;

    const [descriptiveEmbedding, literalEmbedding] = await Promise.all([
        generateEmbedding(descriptive),
        generateEmbedding(literal),
    ]);

    if (!descriptiveEmbedding || descriptiveEmbedding.length !== 1536) {
        throw new Error(`Invalid descriptive embedding dimension: ${descriptiveEmbedding?.length}`);
    }
    if (!literalEmbedding || literalEmbedding.length !== 1536) {
        throw new Error(`Invalid literal embedding dimension: ${literalEmbedding?.length}`);
    }

    const { data: insertData, error: insertError } = await supabase
        .from('photo')
        .insert({
            user_id: user.id,
            device_asset_id,
            descriptive,
            literal,
            tags,
            descriptive_embedding: descriptiveEmbedding,
            literal_embedding: literalEmbedding,
            people: detectedPeople,
            face_count: faceCount,
            face_descriptors: faceDescriptors,
        })
        .select()
        .single();

    if (insertError) throw insertError;

    await Promise.all([
        updatePeopleThumbnails(user, supabase, insertData.id, detectedPeople, faceCount),
        storeUnknownFaces(user, supabase, insertData.id, faces, detectedPeople, faceCount),
    ]);

    console.log(`processImage: completed in ${Date.now() - start}ms, faces: ${faceCount}, people: [${detectedPeople.join(', ')}]`);
    return insertData;
};

const updatePeopleThumbnails = async (user, supabase, photoId, detectedPeople, faceCount) => {
    if (!detectedPeople.length || faceCount !== 1) return;

    const { data: people } = await supabase
        .from('people')
        .select('id, thumbnail_photo_id')
        .eq('user_id', user.id)
        .in('name', detectedPeople);

    if (!people) return;

    await Promise.all(people
        .filter(p => !p.thumbnail_photo_id)
        .map(p => supabase
            .from('people')
            .update({ thumbnail_photo_id: photoId })
            .eq('id', p.id)
        )
    );
};

const storeUnknownFaces = async (user, supabase, photoId, faces, detectedPeople, faceCount) => {
    if (!faces.length || faceCount > 5) return;

    const { data: people } = await supabase
        .from('people')
        .select('descriptors')
        .eq('user_id', user.id);

    const knownDescriptors = (people || []).flatMap(p => p.descriptors.map(d => new Float32Array(d)));

    const unknownFaces = faces.filter(face => {
        if (detectedPeople.length && knownDescriptors.length) return false;
        return true;
    });

    if (!unknownFaces.length) return;

    const representativeDescriptors = unknownFaces.map(f => f.descriptor);

    await supabase.from('unknown_faces').insert({
        user_id: user.id,
        descriptors: representativeDescriptors,
        representative_photo_id: photoId,
    });
};