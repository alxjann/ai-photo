import heicConvert from "heic-convert";
import sharp from "sharp";

export const getCompressedImageBuffer = async (image) => { 
    
    const convertBuffer = await heicConvert({
        buffer: inputHeicBuffer,
        format: "JPEG",
        quality: 1
    });

    const final = await sharp(convertBuffer)
        .resize({ width: 256 })
        .jpeg({ quality: 40 })
        .toBuffer();

    console.log(`Image Compressed`);

    return final;
}