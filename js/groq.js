/* ==========================================================
   groq.js — Groq API client (llama-3.3-70b-versatile)
   Key can be overridden at runtime via localStorage:
     localStorage.setItem('synapse_groq_key', 'gsk_...')
   ========================================================== */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL    = 'llama-3.3-70b-versatile';
const GROQ_API_KEY  = '';  // set your key here, or via localStorage.setItem('synapse_groq_key', 'gsk_...')

async function groqChat(messages, { maxTokens = 1024, temperature = 0.3 } = {}) {
  const key = localStorage.getItem('synapse_groq_key') || GROQ_API_KEY;
  const resp = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature
    })
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Groq ${resp.status}: ${text.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.choices[0].message.content.trim();
}

window.groqChat   = groqChat;
window.GROQ_MODEL = GROQ_MODEL;
