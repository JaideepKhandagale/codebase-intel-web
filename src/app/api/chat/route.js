import { NextResponse } from "next/server";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse";

function extractText(data) {
  const chunks = [];
  for (const c of data?.candidates || [])
    for (const p of c?.content?.parts || [])
      if (typeof p?.text === "string" && p.text.trim()) chunks.push(p.text);
  return chunks.join("\n").trim();
}

function parseSseEvent(event) {
  const dataLines = [];
  for (const line of event.split(/\r?\n/)) {
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }
  return dataLines.join("\n").trim();
}

export async function POST(request) {
  try {
    const { prompt, maxOutputTokens = 1000 } = await request.json();
    if (!prompt) return NextResponse.json({ error: "Missing prompt" }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Gemini API key not configured on server." }, { status: 500 });

    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens },
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ error: data?.error?.message || `Gemini error ${res.status}` }, { status: res.status });
    }
    if (!res.body) return NextResponse.json({ error: "Gemini returned an empty stream." }, { status: 500 });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = "";
    let emittedText = "";
    let sawText = false;

    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split(/\r?\n\r?\n/);
            buffer = events.pop() || "";

            for (const event of events) {
              const payload = parseSseEvent(event);
              if (!payload || payload === "[DONE]") continue;

              const data = JSON.parse(payload);
              const text = extractText(data);
              if (!text) continue;

              const chunk = text.startsWith(emittedText) ? text.slice(emittedText.length) : text;
              if (!chunk) continue;

              sawText = true;
              emittedText = text.startsWith(emittedText) ? text : `${emittedText}${chunk}`;
              controller.enqueue(encoder.encode(chunk));
            }
          }

          buffer += decoder.decode();
          const trailingPayload = parseSseEvent(buffer);
          if (trailingPayload && trailingPayload !== "[DONE]") {
            const data = JSON.parse(trailingPayload);
            const text = extractText(data);
            const chunk = text && text.startsWith(emittedText) ? text.slice(emittedText.length) : text;
            if (chunk) {
              sawText = true;
              controller.enqueue(encoder.encode(chunk));
            }
          }

          if (!sawText) throw new Error("Gemini returned empty response.");
          controller.close();
        } catch (err) {
          controller.error(err);
        } finally {
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
