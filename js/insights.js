/* ==========================================================
   insights.js — document insights.
   Renders heuristic analysis immediately, then upgrades the
   summary/entities/themes/sentiment cards with real Groq AI
   output once the API call resolves.
   ========================================================== */

const STOPWORDS = new Set((`
a about above after again against all am an and any are as at be because been
before being below between both but by could did do does doing down during each
few for from further had has have having he her here hers herself him himself
his how i if in into is it its itself just like me more most my myself no nor
not now of off on once only or other our ours ourselves out over own same she
should so some such than that the their theirs them themselves then there these
they this those through to too under until up very was we were what when where
which while who whom why will with would you your yours yourself yourselves also
been have has had may might must can shall will would should however thus
therefore upon within without among between via per page pages section etc shall
this that these those one two three four five six seven eight nine ten
`).trim().split(/\s+/));

const POS_WORDS = new Set(`
strong growth increase success robust improve improved gains gain profit
positive favorable opportunity advantage outperform expansion record high
optimistic exceed beat better best healthy resilient stable surge rise rising
launch achievement accelerate accelerated win benefit benefits efficient
innovation excellent confidence raised ahead breakthrough leading
`.trim().split(/\s+/));

const NEG_WORDS = new Set(`
risk risks decline declined declining loss losses negative weak weakness slow
slowdown miss missed concern concerns concerned fall falling drop dropped down
poor difficult challenge challenging headwind headwinds problem problems issue
issues lawsuit litigation breach default debt deficit fraud failure failed cut
cuts cutting layoff layoffs disruption volatile volatility uncertain uncertainty
`.trim().split(/\s+/));

function tokenizeWords(text) {
  return text.toLowerCase().match(/[a-z][a-z'-]{1,}/g) || [];
}

function wordFrequencies(text, limit = 30) {
  const freq = new Map();
  for (const tok of tokenizeWords(text)) {
    if (STOPWORDS.has(tok) || tok.length < 3) continue;
    freq.set(tok, (freq.get(tok) || 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(s => s.length > 30 && s.length < 320);
}

function topSentences(text, n = 5) {
  return splitSentences(text)
    .map(s => ({ s, score: s.length + (/\d/.test(s) ? 60 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(x => x.s);
}

function sentimentRatio(text) {
  let pos = 0, neg = 0;
  for (const tok of tokenizeWords(text)) {
    if (POS_WORDS.has(tok)) pos++;
    else if (NEG_WORDS.has(tok)) neg++;
  }
  const total = pos + neg;
  if (total === 0) return { pos: 50, neu: 50, neg: 0 };
  const posPct = Math.round((pos / total) * 80);
  const negPct = Math.round((neg / total) * 80);
  return { pos: posPct, neu: Math.max(0, 100 - posPct - negPct), neg: negPct };
}

function extractEntities(text, limit = 6) {
  const re = /\b([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,}){0,3})\b/g;
  const counts = new Map();
  let m;
  while ((m = re.exec(text)) !== null) {
    const phrase = m[1];
    if (STOPWORDS.has(phrase.toLowerCase())) continue;
    counts.set(phrase, (counts.get(phrase) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function confidenceFor(text) {
  if (!text) return { pct: 0, label: 'No text' };
  const len = text.length;
  if (len > 8000) return { pct: 92, label: 'High confidence' };
  if (len > 2000) return { pct: 76, label: 'Medium confidence' };
  if (len > 400)  return { pct: 58, label: 'Limited confidence' };
  return { pct: 35, label: 'Low confidence' };
}

/* ---- AI insights cache (session) ---- */
const aiInsightsCache = new Map();

/* ---- Groq AI insights ---- */
async function fetchAiInsights(doc) {
  if (!window.groqChat) return;

  if (aiInsightsCache.has(doc.name)) {
    applyAiInsights(aiInsightsCache.get(doc.name));
    return;
  }

  const aiLabelEl = document.querySelector('#insightsGrid .ai-label');
  if (aiLabelEl) aiLabelEl.innerHTML = `<span style="animation:pulse 1.5s infinite">⏳</span> Generating AI insights via Groq…`;

  const snippet = doc.text.slice(0, 6000);
  const prompt = `Analyze this document and respond with ONLY valid JSON, no markdown fences, no extra text:

{
  "summary": "3-4 sentence executive summary with key facts and figures",
  "keyPoints": ["specific point 1", "specific point 2", "specific point 3", "specific point 4", "specific point 5"],
  "entities": [
    {"name": "entity name", "type": "ORG", "role": "what they do in this doc", "mentions": 5}
  ],
  "sentiment": {"pos": 60, "neu": 30, "neg": 10},
  "themes": ["theme phrase 1", "theme phrase 2", "theme phrase 3", "theme phrase 4", "theme phrase 5", "theme phrase 6", "theme phrase 7", "theme phrase 8"]
}

Rules:
- sentiment values must sum to exactly 100
- entity type must be one of: ORG, PER, MONEY, GEO, DATE
- include 5-8 entities and 6-10 themes
- keyPoints must have exactly 5 items

Document name: "${doc.name}"
Document content:
${snippet}`;

  try {
    const raw = await window.groqChat([{ role: 'user', content: prompt }], {
      maxTokens: 1400,
      temperature: 0.2
    });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Groq response');
    const ai = JSON.parse(jsonMatch[0]);
    aiInsightsCache.set(doc.name, ai);
    applyAiInsights(ai);
  } catch (err) {
    console.warn('[synapse] AI insights failed:', err);
    const label = document.querySelector('#insightsGrid .ai-label');
    if (label) label.innerHTML = `<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M2 12h6m8 0h6"/></svg> Heuristic analysis (Groq error)`;
  }
}

function applyAiInsights(ai) {
  const grid = document.getElementById('insightsGrid');
  if (!grid) return;

  const aiLabel = grid.querySelector('.ai-label');
  if (aiLabel) {
    aiLabel.innerHTML = `<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M2 12h6m8 0h6"/></svg> AI summary · ${window.GROQ_MODEL || 'Groq'}`;
  }

  if (ai.summary) {
    const el = grid.querySelector('.summary-text');
    if (el) el.innerHTML = escapeHTML(ai.summary);
  }

  if (ai.keyPoints?.length) {
    const el = grid.querySelector('.key-points');
    if (el) {
      el.innerHTML = ai.keyPoints.map((p, i) => `
        <div class="key-point">
          <div class="key-point-num">${i + 1}</div>
          <div class="key-point-text">${escapeHTML(p)}</div>
        </div>`).join('');
    }
  }

  if (ai.entities?.length) {
    const el = grid.querySelector('.entities-list');
    if (el) {
      const typeClass = { ORG: 'org', PER: 'person', MONEY: 'money', GEO: 'location', DATE: 'date' };
      const typeLabel = { ORG: 'ORG', PER: 'PER', MONEY: '$', GEO: 'GEO', DATE: '📅' };
      el.innerHTML = ai.entities.slice(0, 8).map(e => `
        <div class="entity-row">
          <div class="entity-icon ${typeClass[e.type] || 'org'}">${typeLabel[e.type] || 'ENT'}</div>
          <div class="entity-info">
            <div class="entity-name">${escapeHTML(e.name)}</div>
            <div class="entity-type">${escapeHTML(e.role || e.type || '')}</div>
          </div>
          <div class="entity-count">${e.mentions || '?'} mentions</div>
        </div>`).join('');
    }
  }

  if (ai.sentiment) {
    const { pos = 50, neu = 30, neg = 20 } = ai.sentiment;
    const bar = grid.querySelector('.sentiment-bar');
    if (bar) bar.innerHTML = `
      <div class="pos" style="width:${pos}%"></div>
      <div class="neu" style="width:${neu}%"></div>
      <div class="neg" style="width:${neg}%"></div>`;
    const legend = grid.querySelector('.sentiment-legend');
    if (legend) legend.innerHTML = `
      <div class="pos"><span class="dot"></span>Positive · ${pos}%</div>
      <div class="neu"><span class="dot"></span>Neutral · ${neu}%</div>
      <div class="neg"><span class="dot"></span>Negative · ${neg}%</div>`;
  }

  if (ai.themes?.length) {
    const el = grid.querySelector('.tag-cloud');
    if (el) {
      el.innerHTML = ai.themes.map((t, i) => {
        const cls = i < 2 ? 'xl' : i < 5 ? 'lg' : '';
        return `<span class="cloud-tag ${cls}">${escapeHTML(t)}</span>`;
      }).join('');
    }
  }
}

/* ---- Tab + render state ---- */
let insightsSelectedIdx = 0;

function indexedDocs() {
  return SYNAPSE_DOCS
    .map((d, i) => ({ d, i }))
    .filter(x => x.d.text && x.d.text.length > 200);
}

function renderInsightsTabs(docs) {
  const tabs = document.getElementById('insightsTabs');
  if (!tabs) return;
  if (!docs.length) {
    tabs.innerHTML = `<div class="tab active">No indexed documents</div>`;
    return;
  }
  tabs.innerHTML = docs.slice(0, 5).map(({ d, i }) =>
    `<div class="tab ${i === insightsSelectedIdx ? 'active' : ''}" data-doc-idx="${i}">${escapeHTML(d.name)}</div>`
  ).join('');
  tabs.querySelectorAll('.tab[data-doc-idx]').forEach(el => {
    el.addEventListener('click', () => {
      insightsSelectedIdx = Number(el.dataset.docIdx);
      renderInsights();
    });
  });
}

function renderInsightsEmpty() {
  const grid = document.getElementById('insightsGrid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 48px 24px;">
      <div class="ai-label" style="margin: 0 auto 16px;">
        <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M2 12h6m8 0h6"/></svg>
        Insights
      </div>
      <h2 style="font-size:20px; margin-bottom:6px;">No indexed documents yet</h2>
      <p style="color:var(--text-dim); font-size:14px; max-width:480px; margin:0 auto;">
        Upload a PDF or text document on the Documents tab. Once text is extracted,
        Synapse will generate AI-powered summaries, themes, entities, and sentiment here.
      </p>
    </div>`;
}

function renderInsights() {
  const grid = document.getElementById('insightsGrid');
  if (!grid) return;

  const docs = indexedDocs();
  if (!docs.length) {
    insightsSelectedIdx = -1;
    renderInsightsTabs([]);
    renderInsightsEmpty();
    return;
  }

  if (!SYNAPSE_DOCS[insightsSelectedIdx]?.text) {
    insightsSelectedIdx = docs[0].i;
  }
  renderInsightsTabs(docs);

  const doc      = SYNAPSE_DOCS[insightsSelectedIdx];
  const text     = doc.text;
  const wordCount = (text.match(/\S+/g) || []).length;
  const topTokens = wordFrequencies(text, 30);
  const sentences = topSentences(text, 5);
  const sentiment = sentimentRatio(text);
  const entities  = extractEntities(text, 6);
  const conf      = confidenceFor(text);

  const intro = text.slice(0, 600).replace(/\s+/g, ' ').trim();
  let summary = escapeHTML(intro);
  const top3 = topTokens.slice(0, 3).map(([w]) => w);
  if (top3.length) {
    const re = new RegExp(`\\b(${top3.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'ig');
    summary = summary.replace(re, '<mark>$1</mark>');
  }
  if (text.length > 600) summary += ' …';

  const keyPointsHTML = sentences.length
    ? sentences.map((s, i) => `
        <div class="key-point">
          <div class="key-point-num">${i + 1}</div>
          <div class="key-point-text">${escapeHTML(s)}</div>
        </div>`).join('')
    : `<div class="key-point"><div class="key-point-text" style="color:var(--text-faint)">No long-form sentences found.</div></div>`;

  const cloudHTML = topTokens.slice(0, 24).map(([w, c], i) => {
    const cls = i < 3 ? 'xl' : i < 8 ? 'lg' : '';
    return `<span class="cloud-tag ${cls}" title="${c} occurrences">${escapeHTML(w)}</span>`;
  }).join('');

  const entitiesHTML = entities.length
    ? entities.map(([phrase, count]) => `
        <div class="entity-row">
          <div class="entity-icon org">CAP</div>
          <div class="entity-info">
            <div class="entity-name">${escapeHTML(phrase)}</div>
            <div class="entity-type">Capitalised phrase · heuristic</div>
          </div>
          <div class="entity-count">${count} mentions</div>
        </div>`).join('')
    : `<div style="font-size:12px;color:var(--text-faint)">Not enough repeated entities found.</div>`;

  grid.innerHTML = `
    <div class="insights-col">
      <div class="summary-card">
        <div class="summary-doc-row">
          <div class="doc-icon ${escapeHTML(doc.type)}">${escapeHTML(doc.type.toUpperCase())}</div>
          <div>
            <div class="summary-title">${escapeHTML(doc.name)}</div>
            <div class="summary-meta">${doc.pages || 1} pages · ${wordCount.toLocaleString()} words</div>
          </div>
        </div>
        <div class="ai-label">
          <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M2 12h6m8 0h6"/></svg>
          Heuristic extract · upgrading with Groq…
        </div>
        <p class="summary-text">${summary}</p>
        <div class="key-points" style="margin-top:18px;">${keyPointsHTML}</div>
      </div>
      <div class="card">
        <div class="card-head">
          <div class="card-title">Top themes</div>
          <div class="card-action">${topTokens.length} tokens</div>
        </div>
        <div class="tag-cloud">${cloudHTML}</div>
      </div>
    </div>

    <div class="insights-col">
      <div class="card">
        <div class="card-head">
          <div class="card-title">Named entities</div>
          <div class="card-action">heuristic</div>
        </div>
        <div class="entities-list">${entitiesHTML}</div>
      </div>
      <div class="card">
        <div class="card-head">
          <div class="card-title">Document sentiment</div>
          <div class="card-action">seed-word ratio</div>
        </div>
        <div class="sentiment-bar">
          <div class="pos" style="width:${sentiment.pos}%"></div>
          <div class="neu" style="width:${sentiment.neu}%"></div>
          <div class="neg" style="width:${sentiment.neg}%"></div>
        </div>
        <div class="sentiment-legend">
          <div class="pos"><span class="dot"></span>Positive · ${sentiment.pos}%</div>
          <div class="neu"><span class="dot"></span>Neutral · ${sentiment.neu}%</div>
          <div class="neg"><span class="dot"></span>Negative · ${sentiment.neg}%</div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title">Confidence</div></div>
        <div style="display:flex;align-items:center;gap:14px;margin-top:6px;">
          <div style="position:relative;width:80px;height:80px;">
            <svg viewBox="0 0 36 36" style="width:100%;height:100%;transform:rotate(-90deg);">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="3"/>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="url(#g1)" stroke-width="3" stroke-dasharray="${conf.pct},100" stroke-linecap="round"/>
              <defs><linearGradient id="g1" x1="0" x2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
            </svg>
            <div style="position:absolute;inset:0;display:grid;place-items:center;font-family:'Space Grotesk';font-weight:700;font-size:18px;">${conf.pct}%</div>
          </div>
          <div>
            <div style="font-size:13px;font-weight:600;">${conf.label}</div>
            <div style="font-size:12px;color:var(--text-dim);margin-top:4px;line-height:1.5">
              Based on ${text.length.toLocaleString()} chars of extracted text.
            </div>
          </div>
        </div>
      </div>
    </div>`;

  // Upgrade with real AI in the background
  if (window.groqChat) fetchAiInsights(doc);
}

window.renderInsights = renderInsights;
renderInsights();
