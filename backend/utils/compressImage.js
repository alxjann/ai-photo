import heicConvert from "heic-convert";
import sharp from "sharp";

export const getCompressedImageBuffer = async (imageBuffer) => {
  let bufferToProcess = imageBuffer;

  const isHeic = imageBuffer.slice(4, 12).toString().includes("ftypheic");

  if (isHeic) {
    bufferToProcess = await heicConvert({
      buffer: imageBuffer,
      format: "JPEG",
      quality: 1
    });
  }

  const final = await sharp(bufferToProcess)
    .resize({ width: 256 })
    .jpeg({ quality: 40 })
    .toBuffer();
  return final;
};

export const getThumbnailBuffer = async (image) => {
    const buffer = await sharp(image)
        .resize({ width: 300, height: 300, fit: 'cover' })
        .jpeg({ quality: 60 })
        .toBuffer();

    return buffer;
};