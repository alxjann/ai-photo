import { supabase } from '../config/supabase.js';
import { describeImage } from '../services/ai/describeImage.js';

const migratePhoto = async (photo) => {
    try {
        const base64Data = photo.image_data.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        const description = await describeImage(buffer);
        
        const tagsStart = description.indexOf("[TAGS]");
        const tags = description.substring(tagsStart + 6).trim().toLowerCase();
        
        await supabase
            .from('photo')
            .update({ tags: tags })
            .eq('id', photo.id);
        
        console.log(`Migrated photo ${photo.id}`);
    } catch (error) {
        console.error(`Failed to migrate ${photo.id}:`, error.message);
    }
};

const migrateAll = async () => {
    const { data: photos } = await supabase
        .from('photo')
        .select('id, image_data')
        .is('tags', null);
    
    console.log(`Migrating ${photos.length} photos...`);
    
    for (const photo of photos) {
        await migratePhoto(photo);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('Migration complete');
};

migrateAll();