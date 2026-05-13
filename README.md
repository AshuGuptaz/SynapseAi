# Synapse AI

> **A cinematic AI document intelligence platform** — upload any document, search it semantically, chat with it, and extract deep insights. All in your browser, no backend required.

Built with Next.js 15, Three.js, Groq (llama-3.3-70b), OpenAI embeddings, and Supabase pgvector. Inspired by the Muse AI design aesthetic — earthy, cinematic, system-first.

---

## What is Synapse AI?

Synapse AI turns your documents into a queryable knowledge base. You drag in a PDF, Word doc, spreadsheet, or plain text file — it extracts every word, optionally embeds it into a vector store, and then lets you:

| Feature | What it does |
|---|---|
| **Upload** | Extracts text from PDF, DOCX, XLSX, TXT, MD, CSV, JSON, HTML, XML, LOG (up to 50 MB) |
| **Semantic Search** | Finds the most relevant passages using AI vector embeddings, not keyword matching |
| **Chat** | Ask natural language questions about any document; AI answers with full document context |
| **Insights** | One-click AI analysis: executive summary, key points, named entities, sentiment, themes |
| **Dashboard** | Overview of your library, upload activity, and quick navigation |

Everything works **locally in your browser** without any API keys. Add keys to unlock AI-powered search and chat.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js)                        │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌──────────────────┐ │
│  │Dashboard │  │Documents │  │ Search │  │  Chat / Insights  │ │
│  └────┬─────┘  └────┬─────┘  └───┬────┘  └────────┬─────────┘ │
│       │              │            │                 │           │
│       └──────────────┴────────────┴─────────────────┘           │
│                              │                                  │
│                    localStorage (synapse_docs_v1)               │
│                    Stores doc text + metadata                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │  HTTP (Next.js API Routes)
          ┌────────────────────┼────────────────────┐
          │                    │                    │
   ┌──────▼──────┐     ┌───────▼──────┐    ┌───────▼──────┐
   │ /api/upload │     │  /api/chat   │    │ /api/search  │
   │             │     │  /api/insights    │              │
   │ pdf-parse   │     │              │    │              │
   │ mammoth     │     │  Groq API    │    │  Supabase    │
   │ xlsx        │     │  llama-3.3   │    │  pgvector    │
   └──────┬──────┘     └──────────────┘    └──────────────┘
          │
   ┌──────▼──────────────┐
   │  OpenAI Embeddings  │  (text-embedding-3-small)
   │  Supabase pgvector  │  (upsert + match_doc_chunks RPC)
   └─────────────────────┘
```

### Data flow — Upload

```
File dropped
    │
    ▼
/api/upload
    ├── Extract text  ──► pdf-parse / mammoth / xlsx / raw text
    ├── (if API keys) ──► Chunk text (200 tokens, 30 overlap)
    │                         │
    │                         ▼
    │                   OpenAI embed each chunk
    │                         │
    │                         ▼
    │                   Supabase upsert (doc_chunks table)
    │
    └── Return { docId, name, text, pages, chars, hasEmbedding }
              │
              ▼
        Browser stores in localStorage
```

### Data flow — Chat

```
User message
    │
    ▼
/api/chat
    ├── System prompt + document context (up to 80k chars from localStorage)
    ├── Conversation history
    └── Groq llama-3.3-70b-versatile
              │
              ▼
        Streamed reply → rendered in chat UI
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + CSS custom properties |
| 3D Background | Three.js (animated neural-network particles) |
| Font | Inter (body) · DM Serif Display (headings) |
| Icons | lucide-react |
| Toasts | sonner |
| PDF parsing | pdf-parse |
| DOCX parsing | mammoth |
| XLSX parsing | xlsx |
| AI Chat | Groq API — `llama-3.3-70b-versatile` |
| Embeddings | OpenAI — `text-embedding-3-small` |
| Vector DB | Supabase with `pgvector` extension |
| Local storage | Browser `localStorage` (no backend required) |

---

## Project Structure

```
synapse-next/
├── app/
│   ├── layout.tsx            # Root layout — Sidebar, Topbar, ThreeBackground
│   ├── globals.css           # Design tokens, utility classes
│   ├── page.tsx              # Dashboard
│   ├── documents/page.tsx    # Upload & library
│   ├── search/page.tsx       # Semantic search
│   ├── chat/page.tsx         # AI chat
│   ├── insights/page.tsx     # Document analysis
│   └── api/
│       ├── upload/route.ts   # File ingestion + embedding
│       ├── chat/route.ts     # Groq chat completion
│       ├── search/route.ts   # pgvector similarity search
│       ├── insights/route.ts # Groq document analysis
│       └── documents/route.ts# List Supabase documents
├── components/
│   ├── Sidebar.tsx           # Navigation sidebar
│   ├── Topbar.tsx            # Header bar
│   └── ThreeBackground.tsx   # Animated particle canvas
└── lib/
    ├── groq.ts               # Groq client + chat helper
    ├── openai.ts             # OpenAI embed + chunk helpers
    └── supabase.ts           # Supabase client + upsert/query
```

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/AshuGuptaz/SynapseAi.git
cd SynapseAi
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your keys:

```env
# Required for AI chat and insights
GROQ_API_KEY=gsk_...

# Required for semantic search (embeddings + vector store)
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

> **No keys? No problem.** File upload and text extraction work immediately without any keys. Add keys only when you want AI-powered search and chat.

### 3. Set up Supabase (optional — for semantic search)

In your Supabase project, run this SQL to create the vector table and search function:

```sql
-- Enable pgvector
create extension if not exists vector;

-- Document chunks table
create table doc_chunks (
  id          bigserial primary key,
  doc_id      text not null,
  doc_name    text not null,
  doc_type    text not null,
  chunk_text  text not null,
  embedding   vector(1536),
  metadata    jsonb default '{}'
);

-- Similarity search function
create or replace function match_doc_chunks(
  query_embedding vector(1536),
  match_threshold float default 0.3,
  match_count     int  default 8
)
returns table (
  id         bigint,
  doc_id     text,
  doc_name   text,
  doc_type   text,
  chunk_text text,
  similarity float
)
language sql stable as $$
  select id, doc_id, doc_name, doc_type, chunk_text,
         1 - (embedding <=> query_embedding) as similarity
  from   doc_chunks
  where  1 - (embedding <=> query_embedding) > match_threshold
  order  by embedding <=> query_embedding
  limit  match_count;
$$;
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. First steps

1. Go to **Documents** and drop in a PDF or text file
2. Click **Chat** on the document card to ask questions about it
3. Click **Insights** for an instant AI analysis
4. Use **Search** (requires Supabase + OpenAI keys) for semantic search across all documents

---

## API Keys — Where to get them

| Key | Where to get |
|---|---|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) — free tier available |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) — pay-per-use, embeddings are very cheap |
| Supabase | [supabase.com](https://supabase.com) — free tier supports pgvector |

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set the same environment variables in the Vercel project dashboard under **Settings → Environment Variables**.

---

## License

MIT
