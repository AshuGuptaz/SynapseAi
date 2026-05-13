# Synapse — AI Document Intelligence

> A fully interactive, single-page AI document intelligence platform built with vanilla HTML, CSS, and JavaScript. Upload real documents, run semantic search with vector embeddings, chat with your files via Groq AI, and get auto-generated insights — all in the browser, no backend required.

![Synapse Dashboard](https://img.shields.io/badge/status-live-brightgreen) ![Tech](https://img.shields.io/badge/stack-HTML%20%2F%20CSS%20%2F%20JS-blue) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Browser (Single Page App)                      │
│                                                                         │
│  ┌──────────┐   ┌────────────────────────────────────────────────────┐  │
│  │          │   │                   Main Content                     │  │
│  │ Sidebar  │   │                                                    │  │
│  │          │   │  ┌──────────┐ ┌──────────┐ ┌───────┐ ┌────────┐  │  │
│  │  Nav     │──▶│  │Dashboard │ │Documents │ │Search │ │  Chat  │  │  │
│  │  Items   │   │  └────┬─────┘ └────┬─────┘ └───┬───┘ └───┬────┘  │  │
│  │          │   │       │            │            │         │       │  │
│  └──────────┘   └───────┼────────────┼────────────┼─────────┼───────┘  │
│                         │            │            │         │           │
│  ┌──────────────────────▼────────────▼────────────▼─────────▼────────┐  │
│  │                        JavaScript Modules                         │  │
│  │                                                                   │  │
│  │  dashboard.js   documents.js   search.js    chat.js   insights.js│  │
│  │       │              │             │            │           │     │  │
│  └───────┼──────────────┼─────────────┼────────────┼───────────┼─────┘  │
│          │              │             │            │           │         │
│  ┌───────▼──────────────▼─────────────▼────────────▼───────────▼─────┐  │
│  │                       Core Services                               │  │
│  │                                                                   │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐   │  │
│  │  │ embeddings.js│  │   groq.js    │  │      storage.js         │   │  │
│  │  │             │  │              │  │                        │   │  │
│  │  │ Xenova/     │  │  Groq API    │  │   IndexedDB (persist)  │   │  │
│  │  │ MiniLM-L6   │  │  llama-3.x   │  │   localStorage (hist)  │   │  │
│  │  │ (WASM/ONNX) │  │              │  │                        │   │  │
│  │  └─────────────┘  └──────────────┘  └────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     CDN Libraries (SRI-pinned)                  │    │
│  │   pdf.js (v3)  ·  mammoth.js  ·  SheetJS  ·  transformers.js   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data & Processing Flow

```
User uploads file
       │
       ▼
┌─────────────────┐
│  File Reader API │  ← Drag-and-drop or file picker
└────────┬────────┘
         │
         ▼
┌─────────────────┐     PDF  → pdf.js (text extraction + page map)
│  Text Extractor  │     DOCX → mammoth.js (raw text)
│  (per format)    │     XLSX → SheetJS (CSV rows per sheet)
└────────┬────────┘     TXT/MD/CSV/JSON → FileReader.text()
         │
         ▼
┌─────────────────┐
│  Chunk & Embed  │  ← 180-token chunks, 25-token overlap
│  (MiniLM WASM)  │     384-dim float32 vectors per chunk
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   IndexedDB     │  ← Full doc record + embeddings persisted
│   (storage.js)  │     Survives page reloads
└────────┬────────┘
         │
    ┌────┴────────────────────────┐
    │                             │
    ▼                             ▼
┌──────────┐              ┌───────────────┐
│  Search   │              │  Chat (Groq)  │
│           │              │               │
│ cosine    │              │ top doc text  │
│ similarity│              │ as system     │
│ top-k     │              │ prompt ctx    │
│ reranking │              │ (8 000 chars) │
└──────────┘              └───────────────┘
```

---

## Features

| Feature | Details |
|---------|---------|
| **Real document parsing** | PDF (pdf.js), DOCX (mammoth), XLSX (SheetJS), TXT/MD/CSV/JSON/HTML natively |
| **Semantic search** | MiniLM-L6-v2 embeddings via transformers.js (WASM/ONNX, fully in-browser) |
| **Keyword & hybrid search** | Substring fallback with term-frequency scoring when embeddings aren't ready |
| **AI chat** | Multi-turn conversations grounded in uploaded document text, powered by Groq |
| **Auto insights** | Heuristic summary, key sentences, entity extraction, sentiment ratio — upgrades to Groq AI |
| **Persistent library** | IndexedDB stores documents + embeddings across page reloads |
| **Faceted filtering** | Filter search results by file type, date range, and top entities |
| **Mobile responsive** | Slide-in sidebar with overlay on screens ≤ 800 px |
| **No build step** | Pure HTML/CSS/JS — open `index.html` or serve with any static server |

---

## Views

### Dashboard
KPI cards (documents indexed, searches, AI conversations, retrieval time), 14-day activity bar chart, recent-activity feed, and quick-action shortcuts to all major features.

### Documents
Drag-and-drop upload zone with real-time progress bars. Supports PDF, DOCX, XLSX, PPTX, TXT, MD, CSV, JSON, PNG, JPG. Extracted text is chunked and embedded in the background. Tab filters: All · Recent · Starred · Shared · Trash.

### Smart Search
Natural-language semantic search across your entire library using cosine similarity on MiniLM embeddings. Falls back to keyword matching. Result cards show highlighted snippets, relevance scores, page references, and an "Open in viewer" link. Facet sidebar for type / date / entity filters.

### AI Chat
Document-grounded multi-turn chat via Groq. The most recently uploaded document is used as system-context (up to 8 000 characters). Conversation history is grouped by day and persisted to localStorage. Supports Shift+Enter for multi-line input.

### Insights
Per-document panel with: AI executive summary (Groq), key-point bullets, named-entity list, top-theme word cloud, and sentiment bar. Falls back to heuristic analysis (word frequency, sentence scoring) when no API key is configured.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI framework | Vanilla HTML5 + CSS3 custom properties |
| Fonts | Inter (body) + Space Grotesk (headings) via Google Fonts |
| Embeddings | `@xenova/transformers` — MiniLM-L6-v2 (ONNX, WASM, runs fully in-browser) |
| AI completions | Groq API (`llama-3.3-70b-versatile`) |
| PDF parsing | pdf.js 3.11 (blob-worker strategy for file:// and http://) |
| DOCX parsing | mammoth.js 1.6 |
| XLSX parsing | SheetJS 0.18 |
| Persistence | IndexedDB (docs + embeddings) + localStorage (chat history) |
| CDN | cdnjs.cloudflare.com (SRI-integrity hashed) |

---

## Getting Started

### Option 1 — Instant open

```bash
# Clone
git clone https://github.com/AshuGuptaz/SynapseAi.git
cd SynapseAi

# Open directly (no server needed for basic features)
open index.html
```

### Option 2 — Local server (recommended — unlocks PDF parsing)

```bash
# Python 3
python3 -m http.server 8080

# Node
npx serve .
```

Visit **http://localhost:8080**.

> **Why a server?** pdf.js requires a Worker script. On `file://` the browser blocks cross-origin workers; a local HTTP server resolves this transparently.

### Option 3 — VS Code Live Server

1. Open the folder in VS Code
2. Install the **Live Server** extension (Ritwick Dey)
3. Right-click `index.html` → **Open with Live Server**

---

## Configuration

### Groq API key (enables real AI chat + AI insights)

Open `js/groq.js` and set your key:

```js
const GROQ_API_KEY = 'gsk_your_key_here';
```

Get a free key at [console.groq.com](https://console.groq.com). Without a key the app still works — chat falls back to canned responses and insights use heuristic analysis.

### Customising content

Edit `js/data.js` to change the demo data:

```js
const SYNAPSE_DOCS          = [ ... ];   // document library seed data
const SYNAPSE_SEARCH_RESULTS = [ ... ];  // demo search results
const SYNAPSE_CHAT_REPLIES   = [ ... ];  // canned AI responses
const SYNAPSE_CHART          = { ... };  // 14-day activity chart
```

Design tokens (colours, gradients, surfaces) live in `:root` in `css/base.css`.

---

## Project Structure

```
synapse-app/
├── index.html              # Single HTML file — all five views
├── css/
│   ├── base.css            # Design tokens, reset, app shell, responsive
│   ├── components.css      # Sidebar, topbar, buttons, cards, modals, toast
│   └── views.css           # Dashboard, documents, search, chat, insights
└── js/
    ├── utils.js            # escapeHTML, stripChipPrefix helpers
    ├── data.js             # All mock/seed data
    ├── groq.js             # Groq API client (chat completions)
    ├── embeddings.js       # MiniLM-L6-v2 loader + cosine similarity
    ├── storage.js          # IndexedDB wrapper (idbPutDoc, idbGetAllDocs)
    ├── navigation.js       # View switching, breadcrumb, mobile sidebar
    ├── dashboard.js        # Activity bar chart renderer
    ├── documents.js        # File upload, text extraction, doc grid
    ├── search.js           # Semantic + keyword search, facet filters
    ├── chat.js             # AI chat (Groq), conversation history
    ├── insights.js         # Heuristic + AI insights renderer
    └── app.js              # Toast, keyboard shortcuts, action buttons
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Focus topbar search |
| `Enter` | Send chat message / run search |
| `Shift+Enter` | New line in chat input |
| `Escape` | Close document preview modal |

---

## Browser Support

Modern Chromium, Firefox, and Safari (latest two versions). Requires:
- CSS custom properties
- `backdrop-filter`
- Web Workers (for pdf.js + transformers.js)
- IndexedDB
- ES2020+ (`??`, `?.`, `async/await`)

---

## License

MIT — free to use, fork, and build on.
