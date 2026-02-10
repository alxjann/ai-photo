import sharp from "sharp";

export const getCompressedImageBuffer = async (image) => { 
    
    const buffer = await sharp(image)
        .resize({ width: 256 })
        .jpeg({ quality: 40 })
        .toBuffer();

    console.log(`Image Compressed`);

    return buffer;
}