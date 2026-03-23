import { NextResponse } from "next/server";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

function extractText(data) {
  const chunks = [];
  for (const c of data?.candidates || [])
    for (const p of c?.content?.parts || [])
      if (typeof p?.text === "string" && p.text.trim()) chunks.push(p.text);
  return chunks.join("\n").trim();
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

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data?.error?.message || `Gemini error ${res.status}` }, { status: res.status });

    const text = extractText(data);
    if (!text) return NextResponse.json({ error: "Gemini returned empty response." }, { status: 500 });

    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
