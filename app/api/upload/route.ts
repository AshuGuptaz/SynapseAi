import { NextRequest, NextResponse } from 'next/server';

const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file)                return NextResponse.json({ error: 'No file in request' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 413 });

    const ext   = file.name.split('.').pop()?.toLowerCase() ?? '';
    const docId = crypto.randomUUID();

    // ── Text extraction ───────────────────────────────────────────────────────
    let text  = '';
    let pages = 1;

    if (['txt', 'md', 'csv', 'json', 'log', 'html', 'xml'].includes(ext)) {
      text = await file.text();

    } else if (ext === 'pdf') {
      const buf = Buffer.from(await file.arrayBuffer());

      // pdf-parse is a CommonJS module. Using require() bypasses Turbopack's
      // ESM-interop layer that incorrectly wraps the default export.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as
        (buf: Buffer, opts?: object) => Promise<{ text: string; numpages: number }>;

      if (typeof pdfParse !== 'function') {
        throw new Error('pdf-parse failed to load — please restart the dev server');
      }

      const parsed = await pdfParse(buf);
      text  = parsed.text;
      pages = parsed.numpages;

    } else if (ext === 'docx') {
      const mammoth = await import('mammoth');
      const result  = await mammoth.extractRawText({ buffer: Buffer.from(await file.arrayBuffer()) });
      text = result.value;

    } else if (['xlsx', 'xls'].includes(ext)) {
      const XLSX = await import('xlsx');
      const wb   = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      text  = wb.SheetNames.map(n => `# ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join('\n\n');
      pages = wb.SheetNames.length;

    } else {
      return NextResponse.json({ error: `Unsupported file type: .${ext}` }, { status: 415 });
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'No extractable text found in file.' }, { status: 422 });
    }

    // ── Embed + store (optional — only when env vars are present) ─────────────
    let stored       = 0;
    let hasEmbedding = false;

    if (
      process.env.OPENAI_API_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_KEY
    ) {
      try {
        const { embedText, chunkText } = await import('@/lib/openai');
        const { upsertChunk }          = await import('@/lib/supabase');
        const chunks = chunkText(text, 200, 30);

        for (const chunk of chunks) {
          const embedding = await embedText(chunk);
          await upsertChunk({
            doc_id: docId, doc_name: file.name, doc_type: ext,
            chunk_text: chunk, embedding,
            metadata: { size: file.size, pages, originalName: file.name },
          });
          stored++;
        }
        hasEmbedding = true;
      } catch (embErr) {
        console.warn('[/api/upload] embed/store skipped:', (embErr as Error).message);
      }
    }

    return NextResponse.json({
      docId,
      name:         file.name,
      type:         ext,
      pages,
      chunks:       stored,
      chars:        text.length,
      hasEmbedding,
      text:         text.slice(0, 80_000), // returned so client can store for local chat/insights
    });

  } catch (err) {
    console.error('[/api/upload]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
