// Calls our secure Next.js API routes.
// The Gemini key lives server-side only — never reaches the browser.

export function resolveApiKey() {
  return "server-managed";
}

function formatError(data) {
  const msg = data?.error || "API request failed.";
  const lower = String(msg).toLowerCase();
  if (
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource_exhausted") ||
    lower.includes("exceeded")
  ) {
    return "The AI has reached its usage limit. Please wait a moment and try again.";
  }
  return msg;
}

export async function callAnalyzeAPI({ owner, repo, signal }) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner, repo }),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(formatError(data));
  return data.text || "";
}

export async function callChatAPI({ prompt, maxOutputTokens = 1000, signal }) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxOutputTokens }),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(formatError(data));
  return data.text || "";
}

export async function generateText({ input, maxOutputTokens = 1000, signal }) {
  return callChatAPI({ prompt: input, maxOutputTokens, signal });
}

export async function geminiGenerateContent({ input, maxOutputTokens = 1000, signal }) {
  const text = await callChatAPI({ prompt: input, maxOutputTokens, signal });
  return { candidates: [{ content: { parts: [{ text }] } }] };
}
