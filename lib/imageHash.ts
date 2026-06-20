import sharp from "sharp";

export async function createImageHash(imageBuffer: Buffer) {
  const metadata = await sharp(imageBuffer).metadata();

  const width = metadata.width || 0;
  const height = metadata.height || 0;

  if (!width || !height) {
    throw new Error("Image invalide.");
  }

  const cropLeft = Math.round(width * 0.08);
  const cropTop = Math.round(height * 0.18);
  const cropWidth = Math.round(width * 0.84);
  const cropHeight = Math.round(height * 0.42);

  const raw = await sharp(imageBuffer)
    .extract({
      left: cropLeft,
      top: cropTop,
      width: cropWidth,
      height: cropHeight,
    })
    .resize(32, 32, { fit: "fill" })
    .grayscale()
    .normalize()
    .raw()
    .toBuffer();

  const pixels = Array.from(raw);
  const average = pixels.reduce((sum, value) => sum + value, 0) / pixels.length;

  return pixels.map((value) => (value >= average ? "1" : "0")).join("");
}

export function getHashPrefix(hash: string) {
  return hash.slice(0, 64);
}

export function hammingDistance(hashA: string, hashB: string) {
  const length = Math.min(hashA.length, hashB.length);
  let distance = 0;

  for (let index = 0; index < length; index += 1) {
    if (hashA[index] !== hashB[index]) distance += 1;
  }

  return distance + Math.abs(hashA.length - hashB.length);
}