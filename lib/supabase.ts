import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const svc  = process.env.SUPABASE_SERVICE_KEY!;

/** Browser / RSC client — respects RLS. */
export const supabase = createClient(url, anon);

/** Server-only client — bypasses RLS, use only in API routes. */
export const supabaseAdmin = createClient(url, svc);

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DocChunkRow {
  id:         string;
  doc_id:     string;
  doc_name:   string;
  doc_type:   string;
  chunk_text: string;
  metadata:   Record<string, unknown>;
  similarity: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Store a document chunk + its embedding in Supabase.
 * Run the SQL below once in the Supabase SQL editor:
 *
 *   create extension if not exists vector;
 *
 *   create table doc_chunks (
 *     id         uuid primary key default gen_random_uuid(),
 *     doc_id     text not null,
 *     doc_name   text not null,
 *     doc_type   text not null,
 *     chunk_text text not null,
 *     embedding  vector(1536),
 *     metadata   jsonb,
 *     created_at timestamptz default now()
 *   );
 *
 *   create index on doc_chunks
 *     using ivfflat (embedding vector_cosine_ops)
 *     with (lists = 100);
 *
 *   create or replace function match_doc_chunks(
 *     query_embedding vector(1536),
 *     match_threshold float,
 *     match_count     int
 *   ) returns table (
 *     id text, doc_id text, doc_name text, doc_type text,
 *     chunk_text text, metadata jsonb, similarity float
 *   ) language sql stable as $$
 *     select id::text, doc_id, doc_name, doc_type, chunk_text, metadata,
 *            1 - (embedding <=> query_embedding) as similarity
 *     from   doc_chunks
 *     where  1 - (embedding <=> query_embedding) > match_threshold
 *     order  by (embedding <=> query_embedding)
 *     limit  match_count;
 *   $$;
 */
export async function upsertChunk(payload: {
  doc_id:    string;
  doc_name:  string;
  doc_type:  string;
  chunk_text: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from('doc_chunks').insert(payload);
  if (error) throw error;
}

export async function matchChunks(
  queryEmbedding: number[],
  threshold = 0.5,
  count = 8
): Promise<DocChunkRow[]> {
  const { data, error } = await supabaseAdmin.rpc('match_doc_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count:     count,
  });
  if (error) throw error;
  return data as DocChunkRow[];
}

export async function deleteDocChunks(docId: string) {
  const { error } = await supabaseAdmin
    .from('doc_chunks')
    .delete()
    .eq('doc_id', docId);
  if (error) throw error;
}

export interface DocSummaryRow {
  doc_id:    string;
  doc_name:  string;
  doc_type:  string;
  chunk_count: number;
  created_at: string;
}

export async function listDocuments(): Promise<DocSummaryRow[]> {
  const { data, error } = await supabaseAdmin
    .from('doc_chunks')
    .select('doc_id, doc_name, doc_type, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Deduplicate by doc_id and count chunks
  const map = new Map<string, DocSummaryRow>();
  for (const row of (data ?? []) as Array<{ doc_id: string; doc_name: string; doc_type: string; created_at: string }>) {
    if (!map.has(row.doc_id)) {
      map.set(row.doc_id, { ...row, chunk_count: 1 });
    } else {
      map.get(row.doc_id)!.chunk_count++;
    }
  }
  return [...map.values()];
}
