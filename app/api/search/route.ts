import { NextRequest, NextResponse } from 'next/server';
import { embedText } from '@/lib/openai';
import { matchChunks } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { query, limit = 8, threshold = 0.45 } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query required' }, { status: 400 });
    }

    const queryEmbedding = await embedText(query);
    const results = await matchChunks(queryEmbedding, threshold, limit);

    // Group chunks by document and pick best snippet per doc
    const byDoc = new Map<string, typeof results[number]>();
    for (const r of results) {
      const existing = byDoc.get(r.doc_id);
      if (!existing || r.similarity > existing.similarity) {
        byDoc.set(r.doc_id, r);
      }
    }

    const formatted = [...byDoc.values()].map(r => ({
      type:     r.doc_type,
      title:    r.doc_name,
      score:    Math.round(r.similarity * 100) + '%',
      snippet:  r.chunk_text.slice(0, 300),
      metadata: r.metadata,
      mode:     'semantic',
    }));

    return NextResponse.json({ results: formatted });
  } catch (err) {
    console.error('[/api/search]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
