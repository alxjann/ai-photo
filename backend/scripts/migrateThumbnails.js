import { supabase } from '../config/supabase.js';
import { getThumbnailBuffer } from '../utils/compressImage.js';

const migrateThumbnails = async () => {
    const { data: photos, error } = await supabase
        .from('photo')
        .select('id, image_data')
        .is('thumbnail_data', null);

    if (error) {
        console.error('Failed to fetch photos:', error);
        process.exit(1);
    }

    console.log(`Found ${photos.length} photos to migrate`);

    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        try {
            const base64Data = photo.image_data.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const thumbnailBuffer = await getThumbnailBuffer(buffer);
            const base64Thumbnail = `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`;

            const { error: updateError } = await supabase
                .from('photo')
                .update({ thumbnail_data: base64Thumbnail })
                .eq('id', photo.id);

            if (updateError) throw updateError;

            console.log(`${i + 1}/${photos.length} done`);
        } catch (err) {
            console.error(`Failed on photo ${photo.id}:`, err.message);
        }
    }

    console.log('Migration complete');
    process.exit(0);
};

migrateThumbnails();