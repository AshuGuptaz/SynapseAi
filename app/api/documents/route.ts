import { NextResponse } from 'next/server';
import { listDocuments } from '@/lib/supabase';

export async function GET() {
  try {
    const docs = await listDocuments();
    return NextResponse.json({ docs });
  } catch (err) {
    console.error('[/api/documents]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
