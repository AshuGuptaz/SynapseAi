import Groq from 'groq-sdk';

if (!process.env.GROQ_API_KEY) {
  console.warn('[synapse] GROQ_API_KEY is not set — AI features will be disabled.');
}

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? '',
});

export const GROQ_MODEL = 'llama-3.3-70b-versatile';

export async function groqChat(
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const { maxTokens = 1024, temperature = 0.3 } = options;

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    max_tokens: maxTokens,
    temperature,
  });

  return response.choices[0].message.content?.trim() ?? '';
}
