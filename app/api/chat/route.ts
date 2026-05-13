import { NextRequest } from 'next/server';
import { groq, GROQ_MODEL } from '@/lib/groq';

export async function POST(req: NextRequest) {
  try {
    const { messages, docContext, docName } = await req.json();

    if (!messages?.length) {
      return new Response(JSON.stringify({ error: 'messages required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not configured. Add it to .env.local to enable AI chat.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const systemPrompt = docContext
      ? `You are Synapse, an expert AI document assistant. You are analyzing the document "${docName ?? 'unknown'}".

Answer the user's questions based ONLY on the document content below. Be specific and accurate. Quote relevant passages when helpful. If the answer is not in the document, say so clearly.

DOCUMENT CONTENT:
${String(docContext).slice(0, 8000)}${docContext.length > 8000 ? '\n\n[...document continues, showing first 8000 chars...]' : ''}`
      : `You are Synapse, an AI assistant. No document is currently loaded. Help the user with general questions, or suggest they upload a document from the Documents section to enable document-specific queries.`;

    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 1024,
      temperature: 0.3,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? '';
            if (delta) controller.enqueue(encoder.encode(delta));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (err) {
    console.error('[/api/chat]', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
