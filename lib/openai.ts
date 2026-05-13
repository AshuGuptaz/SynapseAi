import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.warn('[synapse] OPENAI_API_KEY is not set — semantic search will be disabled.');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
});

export const EMBED_MODEL = 'text-embedding-3-small';
export const EMBED_DIM   = 1536;

export async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: text.slice(0, 8191), // model's token limit
  });
  return res.data[0].embedding;
}

/** Split text into overlapping chunks (word-based). */
export function chunkText(
  text: string,
  chunkWords = 200,
  overlapWords = 30
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + chunkWords).join(' '));
    i += chunkWords - overlapWords;
  }
  return chunks.filter(c => c.length > 40);
}
