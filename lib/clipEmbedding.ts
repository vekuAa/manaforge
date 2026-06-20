import { pipeline } from "@huggingface/transformers";

type EmbeddingOutput = {
  data: Float32Array | number[];
};

type ImageExtractor = (
  input: string,
  options?: {
    pooling?: "mean" | "cls";
    normalize?: boolean;
  },
) => Promise<EmbeddingOutput>;

let extractorPromise: Promise<ImageExtractor> | null = null;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      "image-feature-extraction",
      "Xenova/clip-vit-base-patch32",
    ).then((extractor) => extractor as unknown as ImageExtractor);
  }

  return extractorPromise;
}

export async function createClipEmbedding(imageBuffer: Buffer) {
  const extractor = await getExtractor();

  const base64 = imageBuffer.toString("base64");
  const imageUrl = `data:image/jpeg;base64,${base64}`;

  const output = await extractor(imageUrl, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data);
}

export function cosineSimilarity(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);

  if (length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  if (normA === 0 || normB === 0) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}