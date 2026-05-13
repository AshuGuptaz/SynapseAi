import { NextRequest, NextResponse } from 'next/server';
import { groqChat } from '@/lib/groq';

export async function POST(req: NextRequest) {
  try {
    const { text, docName } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }

    const snippet = text.slice(0, 6000);
    const prompt = `Analyze this document and respond with ONLY valid JSON (no markdown fences):

{
  "summary": "3–4 sentence executive summary with key facts and figures",
  "keyPoints": ["specific point 1", "point 2", "point 3", "point 4", "point 5"],
  "entities": [
    {"name": "entity name", "type": "ORG", "role": "what they do", "mentions": 5}
  ],
  "sentiment": {"pos": 60, "neu": 30, "neg": 10},
  "themes": ["theme 1", "theme 2", "theme 3", "theme 4", "theme 5", "theme 6"]
}

Rules:
- sentiment values must sum to 100
- entity type: ORG | PER | MONEY | GEO | DATE
- 5–8 entities, 6–10 themes, exactly 5 keyPoints

Document: "${docName ?? 'untitled'}"
Content:
${snippet}`;

    const raw = await groqChat(
      [{ role: 'user', content: prompt }],
      { maxTokens: 1400, temperature: 0.2 }
    );

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in Groq response');

    const insights = JSON.parse(match[0]);
    return NextResponse.json(insights);
  } catch (err) {
    console.error('[/api/insights]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
