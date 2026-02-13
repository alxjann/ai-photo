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
