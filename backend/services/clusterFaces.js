import { clusterFaces as runClustering } from './ai/faceRecognition.js';

export const clusterUnknownFaces = async (user, supabase) => {
    const { data: photos } = await supabase
        .from('photo')
        .select('id, face_count, face_descriptors, people')
        .eq('user_id', user.id)
        .gt('face_count', 0)
        .lte('face_count', 5);

    if (!photos || !photos.length) return [];

    const { data: knownPeople } = await supabase
        .from('people')
        .select('descriptors')
        .eq('user_id', user.id);

    const knownDescriptors = (knownPeople || []).flatMap(p => p.descriptors);

    const allFaces = [];
    for (const photo of photos) {
        for (const descriptor of (photo.face_descriptors || [])) {
            const isKnown = knownDescriptors.some(known => {
                const dist = euclidean(descriptor, known);
                return dist < 0.45;
            });
            if (!isKnown) {
                allFaces.push({
                    descriptor,
                    photo_id: photo.id,
                    face_count: photo.face_count,
                });
            }
        }
    }

    if (!allFaces.length) return [];

    const clusters = await runClustering(allFaces);

    await supabase.from('unknown_faces').delete().eq('user_id', user.id);

    if (clusters.length) {
        await supabase.from('unknown_faces').insert(
            clusters.map(c => ({
                user_id: user.id,
                descriptors: c.descriptors,
                representative_photo_id: c.representative_photo_id,
            }))
        );
    }

    return clusters;
};

export const labelUnknownFace = async (user, supabase, unknownFaceId, name) => {
    const { data: unknown } = await supabase
        .from('unknown_faces')
        .select('descriptors, representative_photo_id')
        .eq('id', unknownFaceId)
        .eq('user_id', user.id)
        .single();

    if (!unknown) throw new Error('Unknown face not found');

    const { data: existingPerson } = await supabase
        .from('people')
        .select('id, descriptors, thumbnail_photo_id')
        .eq('user_id', user.id)
        .eq('name', name.toLowerCase())
        .maybeSingle();

    let personId;

    if (existingPerson) {
        const merged = [...existingPerson.descriptors, ...unknown.descriptors];
        const updates = { descriptors: merged };
        if (!existingPerson.thumbnail_photo_id && unknown.representative_photo_id) {
            updates.thumbnail_photo_id = unknown.representative_photo_id;
        }
        await supabase.from('people').update(updates).eq('id', existingPerson.id);
        personId = existingPerson.id;
    } else {
        const { data: newPerson } = await supabase
            .from('people')
            .insert({
                user_id: user.id,
                name: name.toLowerCase(),
                descriptors: unknown.descriptors,
                thumbnail_photo_id: unknown.representative_photo_id || null,
            })
            .select()
            .single();
        personId = newPerson.id;
    }

    await supabase.from('unknown_faces').delete().eq('id', unknownFaceId);

    await backfillPhotos(user, supabase, unknown.descriptors, name.toLowerCase());

    return { personId };
};

const backfillPhotos = async (user, supabase, newDescriptors, name) => {
    const { data: photos } = await supabase
        .from('photo')
        .select('id, face_descriptors, people, tags')
        .eq('user_id', user.id)
        .gt('face_count', 0);

    if (!photos) return;

    for (const photo of photos) {
        if (!photo.face_descriptors?.length) continue;
        if (photo.people?.includes(name)) continue;

        const isMatch = photo.face_descriptors.some(descriptor => {
            return newDescriptors.some(known => euclidean(descriptor, known) < 0.45);
        });

        if (isMatch) {
            const updatedPeople = [...(photo.people || []), name];
            const updatedTags = photo.tags
                ? `${photo.tags}, person:${name}`
                : `person:${name}`;
            await supabase
                .from('photo')
                .update({ people: updatedPeople, tags: updatedTags })
                .eq('id', photo.id);
        }
    }
};

const euclidean = (a, b) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
};