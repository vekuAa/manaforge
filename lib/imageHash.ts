import sharp from "sharp";

async function createAverageHash(
  imageBuffer: Buffer,
  options?: {
    leftRatio?: number;
    topRatio?: number;
    widthRatio?: number;
    heightRatio?: number;
    size?: number;
  },
) {
  const metadata = await sharp(imageBuffer).metadata();

  const width = metadata.width || 0;
  const height = metadata.height || 0;

  if (!width || !height) {
    throw new Error("Image invalide.");
  }

  const size = options?.size || 32;

  let pipeline = sharp(imageBuffer);

  if (
    options?.leftRatio !== undefined &&
    options?.topRatio !== undefined &&
    options?.widthRatio !== undefined &&
    options?.heightRatio !== undefined
  ) {
    pipeline = pipeline.extract({
      left: Math.max(0, Math.round(width * options.leftRatio)),
      top: Math.max(0, Math.round(height * options.topRatio)),
      width: Math.max(1, Math.round(width * options.widthRatio)),
      height: Math.max(1, Math.round(height * options.heightRatio)),
    });
  }

  const raw = await pipeline
    .resize(size, size, { fit: "fill" })
    .grayscale()
    .normalize()
    .raw()
    .toBuffer();

  const pixels = Array.from(raw);
  const average = pixels.reduce((sum, value) => sum + value, 0) / pixels.length;

  return pixels.map((value) => (value >= average ? "1" : "0")).join("");
}

export async function createImageHash(imageBuffer: Buffer) {
  const fullHash = await createAverageHash(imageBuffer, {
    size: 24,
  });

  const artHash = await createAverageHash(imageBuffer, {
    leftRatio: 0.08,
    topRatio: 0.18,
    widthRatio: 0.84,
    heightRatio: 0.42,
    size: 32,
  });

  const bottomHash = await createAverageHash(imageBuffer, {
    leftRatio: 0.08,
    topRatio: 0.62,
    widthRatio: 0.84,
    heightRatio: 0.22,
    size: 16,
  });

  return `${artHash}${fullHash}${bottomHash}`;
}

export function getHashPrefix(hash: string) {
  return hash.slice(0, 96);
}

export function hammingDistance(hashA: string, hashB: string) {
  const length = Math.min(hashA.length, hashB.length);
  let distance = 0;

  for (let index = 0; index < length; index += 1) {
    if (hashA[index] !== hashB[index]) distance += 1;
  }

  return distance + Math.abs(hashA.length - hashB.length);
}