import { NextResponse } from "next/server";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

function buildPrompt(owner, repo) {
  return `Analyze: https://github.com/${owner}/${repo}

Search the web to understand this repository. Return ONLY compact raw JSON, no markdown.
Keep arrays short: folder_structure max 8, dependency_map max 8, critical_files max 8, key_design_decisions max 5, risks max 5.

JSON shape:
{
  "repo_name":"${owner}/${repo}",
  "summary":"2-3 sentence description",
  "tech_stack":["tech1","tech2"],
  "architecture_style":"e.g. Component-based / MVC / Monolithic",
  "language":"Primary language",
  "folder_structure":[{"path":"folder","purpose":"plain english","type":"frontend|backend|config|test|docs|other"}],
  "entry_point":{"file":"filename","description":"what it does","execution_flow":["Step 1","Step 2","Step 3","Step 4","Step 5"]},
  "dependency_map":[{"file":"src/file","role":"what it does","depends_on":["dep1"]}],
  "critical_files":[{"file":"path","role":"why critical","importance":"critical|high|medium|low"}],
  "key_design_decisions":["decision 1","decision 2","decision 3"],
  "risks":[{"title":"risk","severity":"critical|high|medium|low","detail":"why it matters"}],
  "health_scores":{"documentation":75,"architecture":80,"testability":60,"modularity":70}
}`;
}

function extractText(data) {
  const chunks = [];
  for (const candidate of data?.candidates || []) {
    for (const part of candidate?.content?.parts || []) {
      if (typeof part?.text === "string" && part.text.trim()) {
        chunks.push(part.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

export async function POST(request) {
  try {
    const { owner, repo } = await request.json();
    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Missing owner or repo" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured on server." },
        { status: 500 }
      );
    }

    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(owner, repo) }] }],
        generationConfig: { maxOutputTokens: 6500 },
        tools: [{ google_search: {} }],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || `Gemini error ${res.status}` },
        { status: res.status }
      );
    }

    const text = extractText(data);
    if (!text) {
      return NextResponse.json(
        { error: "Gemini returned empty response." },
        { status: 500 }
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
