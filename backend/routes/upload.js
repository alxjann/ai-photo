import express from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload image endpoint
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { descriptiveTag, literalTag } = req.body;
    const file = req.file;
    const fileName = `${Date.now()}_${file.originalname}`;

    // upload to supabase
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

    // get public u rl
    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName);

    // save metadata to database
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
      ])
      .select();

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
});

export default router;