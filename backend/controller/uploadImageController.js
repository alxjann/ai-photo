import { supabase } from '../config/supabase.js';

export const uploadImage = async (req, res) => {
    try {
    	if (!req.file) {
        	return res.stats(400).json({
				error: 'No image file provided'
          	});
        }

        const { descriptiveTag, literalTag } = req.body;
		const file = req.file;
		const fileName = `${Date.now()}_${file.originalname}`;

		const { data: storageData, error: storageError } = await supabase.storage
      		.from('photos')
      		.upload(fileName, file.buffer, {
        	contentType: file.mimetype,
        	cacheControl: '3600'
      	});

    	if (storageError) {
      		console.error('Storage error:', storageError);
      		return res.status(500).json({ error: 'Failed to upload image' });
    	}

    	const { data: { publicUrl } } = supabase.storage
      		.from('photos')
      		.getPublicUrl(fileName);

    	const { data: dbData, error: dbError } = await supabase
      		.from('images')
      		.insert([
        	{
          		filename: fileName,
				url: publicUrl,
				descriptive_tag: descriptiveTag || null,
				literal_tag: literalTag || null,
				created_at: new Date().toISOString()
			}
      	]).select();

		if (dbError) {
			console.error('Database error:', dbError);
			return res.status(500).json({ error: 'Failed to save metadata' });
		}

		res.status(201).json({
			message: 'Image uploaded successfully',
			data: dbData[0]
		});

	} catch (error) {
		console.error('Upload error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
};