import sharp from "sharp";

export async function createImageHash(imageBuffer: Buffer) {
  const raw = await sharp(imageBuffer)
    .resize(16, 16, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer();

  const pixels = Array.from(raw);
  const average = pixels.reduce((sum, value) => sum + value, 0) / pixels.length;

  return pixels.map((value) => (value >= average ? "1" : "0")).join("");
}

export function getHashPrefix(hash: string) {
  return hash.slice(0, 32);
}

export function hammingDistance(hashA: string, hashB: string) {
  const length = Math.min(hashA.length, hashB.length);
  let distance = 0;

  for (let index = 0; index < length; index += 1) {
    if (hashA[index] !== hashB[index]) distance += 1;
  }

  return distance + Math.abs(hashA.length - hashB.length);
}