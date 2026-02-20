import sharp from "sharp";

export const getCompressedImageBuffer = async (image) => { 
    const buffer = await sharp(image)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

    return buffer;
};

export const getThumbnailBuffer = async (image) => {
    const buffer = await sharp(image)
        .resize({ width: 300, height: 300, fit: 'cover' })
        .jpeg({ quality: 60 })
        .toBuffer();

    return buffer;
};