import { NextRequest, NextResponse } from 'next/server';
import { groqChat } from '@/lib/groq';

export async function POST(req: NextRequest) {
  try {
    const { messages, docContext, docName } = await req.json();

    if (!messages?.length) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 });
    }

    const systemPrompt = docContext
      ? `You are Synapse, an expert AI document assistant. You are analyzing the document "${docName ?? 'unknown'}".

Answer the user's questions based ONLY on the document content below. Be specific and accurate. Quote relevant passages when helpful. If the answer is not in the document, say so clearly.

DOCUMENT CONTENT:
${String(docContext).slice(0, 8000)}${docContext.length > 8000 ? '\n\n[...document continues, showing first 8000 chars...]' : ''}`
      : `You are Synapse, an AI document assistant. No document is currently loaded. Ask the user to upload a document from the Documents section first.`;

    const reply = await groqChat(
      [{ role: 'system', content: systemPrompt }, ...messages],
      { maxTokens: 1024, temperature: 0.3 }
    );

    return NextResponse.json({ content: reply });
  } catch (err) {
    console.error('[/api/chat]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
