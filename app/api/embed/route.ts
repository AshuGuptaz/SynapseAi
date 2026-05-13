import { NextRequest, NextResponse } from 'next/server';
import { embedText, chunkText } from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const { text, mode = 'single' } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }

    if (mode === 'chunks') {
      const chunks = chunkText(text, 200, 30);
      const embeddings = await Promise.all(chunks.map(c => embedText(c)));
      return NextResponse.json({ chunks, embeddings });
    }

    const embedding = await embedText(text);
    return NextResponse.json({ embedding });
  } catch (err) {
    console.error('[/api/embed]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
