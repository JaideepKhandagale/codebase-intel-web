// setup.js — Run with: node setup.js
// Creates all files needed for the Next.js migration

const fs = require("fs");
const path = require("path");

function write(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  console.log("✓", filePath);
}

function copyFrom(from, to) {
  const oldPath = path.join("..", "src", from);
  if (fs.existsSync(oldPath)) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(oldPath, to);
    console.log("✓ copied", to);
  } else {
    console.log("⚠ not found (skip):", oldPath);
  }
}

// ── Copy unchanged files from old project ───────────────────────────
copyFrom("components/CILogo.jsx",        "src/components/CILogo.jsx");
copyFrom("components/ResultView.jsx",    "src/components/ResultView.jsx");
copyFrom("components/dashboardBits.jsx", "src/components/dashboardBits.jsx");
copyFrom("components/ui.jsx",            "src/components/ui.jsx");
copyFrom("lib/normalize.js",             "src/lib/normalize.js");
copyFrom("lib/exporters.js",             "src/lib/exporters.js");
copyFrom("lib/share.js",                 "src/lib/share.js");
copyFrom("lib/storage.js",               "src/lib/storage.js");
copyFrom("lib/theme.js",                 "src/lib/theme.js");
copyFrom("hooks/usePersistentState.js",  "src/hooks/usePersistentState.js");
copyFrom("hooks/useAutoScroll.js",       "src/hooks/useAutoScroll.js");

// ── src/config/appConfig.js ──────────────────────────────────────────
write("src/config/appConfig.js", `\
export const APP_NAME = "Codebase.intel";
export const APP_VERSION = "v10";

export const GEMINI_CONFIG = {
  analysisModel: "gemini-2.5-flash",
  chatModel: "gemini-2.5-flash",
  storageKeys: {
    analysisCache: "codebase_intel_analysis_cache",
    repoHistory: "codebase_intel_repo_history",
    shareIndex: "codebase_intel_share_index",
  },
};

export const DEMO_ACTIONS = [
  { id: "auth",       label: "Trace Auth Flow",           icon: "A" },
  { id: "request",    label: "Trace Request Flow",        icon: "R" },
  { id: "data",       label: "Trace Data Flow",           icon: "D" },
  { id: "onboarding", label: "Generate Onboarding Brief", icon: "O" },
  { id: "risks",      label: "Find Risky Areas",          icon: "!" },
];

export const EXAMPLE_REPOS = [
  "facebook/react",
  "pallets/flask",
  "expressjs/express",
  "vercel/next.js",
  "django/django",
];
`);

// ── src/lib/gemini.js ────────────────────────────────────────────────
write("src/lib/gemini.js", `\
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
`);

// ── src/lib/repoService.js ───────────────────────────────────────────
write("src/lib/repoService.js", `\
import { callAnalyzeAPI, generateText, geminiGenerateContent } from "./gemini";
import { extractOutputText, normalizeAnalysis, repairJSON } from "./normalize";

export function parseRepoUrl(url) {
  const clean = url.trim().startsWith("http") ? url.trim() : \`https://\${url.trim()}\`;
  const match = clean.match(/github\\.com\\/([^/\\s]+)\\/([^/\\s#?]+)/i);
  if (!match) throw new Error("Invalid GitHub URL. Try: github.com/owner/repo");
  return {
    clean,
    owner: match[1],
    repo: match[2].replace(/\\.git$/i, ""),
    repoKey: \`\${match[1]}/\${match[2].replace(/\\.git$/i, "")}\`,
  };
}

async function repairJSONWithAI(raw, signal) {
  const data = await geminiGenerateContent({
    input: \`Convert this broken JSON into valid JSON only. Return a single JSON object, no markdown.\\n\\n\${raw}\`,
    maxOutputTokens: 3000,
    signal,
  });
  const output = extractOutputText(data);
  if (!output) throw new Error("Could not repair the JSON response.");
  return output;
}

export async function analyzeRepository({ url, signal, onLog }) {
  const { owner, repo, repoKey } = parseRepoUrl(url);
  onLog?.("system", "Connecting to analysis server...");
  onLog?.("search", \`Researching \${repoKey} with live web search...\`);
  const text = await callAnalyzeAPI({ owner, repo, signal });
  onLog?.("info", "Reading repository structure...");
  onLog?.("info", "Mapping dependencies...");
  onLog?.("info", "Scoring health and surfacing risks...");
  let parsed;
  try {
    parsed = repairJSON(text);
  } catch {
    onLog?.("info", "Repairing response...");
    const fixed = await repairJSONWithAI(text, signal);
    parsed = repairJSON(fixed);
  }
  onLog?.("success", "Analysis complete.");
  return normalizeAnalysis(parsed, repoKey);
}

export async function askRepoQuestion({ question, repoContext, signal }) {
  const text = await generateText({
    input: \`You are a codebase expert. Answer using only the analysis provided. Be concise, under 180 words. Cite file paths when relevant.

Repository Analysis:
\${JSON.stringify(repoContext, null, 2)}

Question: \${question}\`,
    maxOutputTokens: 1000,
    signal,
  });
  return text || "No response.";
}

const QUICK_ACTION_PROMPTS = {
  auth: "Trace the authentication flow. Mention entry files, middleware, and sensitive handoff points.",
  request: "Trace the main request flow from entry point through major modules. Make it practical and ordered.",
  data: "Trace the main data flow, persistence touch points, and transformation stages.",
  onboarding: "Write a short onboarding brief. Include where to start, what to read first, safe files to edit, and risk areas.",
  risks: "List the riskiest areas to change. Give severity, why each is risky, and the most relevant files.",
};

export async function runQuickAction({ actionId, repoContext, signal }) {
  const prompt = QUICK_ACTION_PROMPTS[actionId];
  if (!prompt) throw new Error("Unknown quick action.");
  return askRepoQuestion({ question: prompt, repoContext, signal });
}

export async function explainFile({ file, repoContext, signal }) {
  return askRepoQuestion({
    question: \`Explain the role of \${file}. Cover why it matters, what it depends on, and what changes here could break.\`,
    repoContext,
    signal,
  });
}
`);

// ── src/app/api/analyze/route.js ─────────────────────────────────────
write("src/app/api/analyze/route.js", `\
import { NextResponse } from "next/server";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

function buildPrompt(owner, repo) {
  return \`Analyze: https://github.com/\${owner}/\${repo}

Search the web to understand this repository. Return ONLY compact raw JSON, no markdown.
Keep arrays short: folder_structure max 8, dependency_map max 8, critical_files max 8, key_design_decisions max 5, risks max 5.

JSON shape:
{
  "repo_name":"\${owner}/\${repo}",
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
}\`;
}

function extractText(data) {
  const chunks = [];
  for (const c of data?.candidates || [])
    for (const p of c?.content?.parts || [])
      if (typeof p?.text === "string" && p.text.trim()) chunks.push(p.text);
  return chunks.join("\\n").trim();
}

export async function POST(request) {
  try {
    const { owner, repo } = await request.json();
    if (!owner || !repo) return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Gemini API key not configured on server." }, { status: 500 });

    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(owner, repo) }] }],
        generationConfig: { maxOutputTokens: 6500 },
        tools: [{ google_search: {} }],
      }),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data?.error?.message || \`Gemini error \${res.status}\` }, { status: res.status });

    const text = extractText(data);
    if (!text) return NextResponse.json({ error: "Gemini returned empty response." }, { status: 500 });

    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
`);

// ── src/app/api/chat/route.js ────────────────────────────────────────
write("src/app/api/chat/route.js", `\
import { NextResponse } from "next/server";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

function extractText(data) {
  const chunks = [];
  for (const c of data?.candidates || [])
    for (const p of c?.content?.parts || [])
      if (typeof p?.text === "string" && p.text.trim()) chunks.push(p.text);
  return chunks.join("\\n").trim();
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
    if (!res.ok) return NextResponse.json({ error: data?.error?.message || \`Gemini error \${res.status}\` }, { status: res.status });

    const text = extractText(data);
    if (!text) return NextResponse.json({ error: "Gemini returned empty response." }, { status: 500 });

    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
`);

// ── src/app/page.js ──────────────────────────────────────────────────
write("src/app/page.js", `\
import App from "../components/App";

export const metadata = {
  title: "Codebase.intel — AI Repository Intelligence",
  description: "Understand any GitHub repository in minutes with AI.",
};

export default function Page() {
  return <App />;
}
`);

// ── src/components/App.jsx ───────────────────────────────────────────
write("src/components/App.jsx", `\
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { APP_NAME, APP_VERSION, EXAMPLE_REPOS, GEMINI_CONFIG } from "../config/appConfig";
import { fonts, theme } from "../lib/theme";
import { buildShareUrl, loadSharedResult, parseSharePayload, saveShareResult } from "../lib/share";
import { analyzeRepository, askRepoQuestion, explainFile, parseRepoUrl, runQuickAction } from "../lib/repoService";
import { usePersistentState } from "../hooks/usePersistentState";
import { useAutoScroll } from "../hooks/useAutoScroll";
import CILogo from "./CILogo";
import { LogLine, SectionHeading } from "./ui";
import ResultView from "./ResultView";
import { ErrorState, LandingFeatureGrid, RepoHistory } from "./dashboardBits";

function getNow() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function getOverallHealth(scores) {
  const values = Object.values(scores || {});
  return values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : null;
}
function copyText(text) {
  if (navigator?.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const el = document.createElement("textarea");
  el.value = text; document.body.appendChild(el); el.select();
  document.execCommand("copy"); document.body.removeChild(el);
  return Promise.resolve();
}
function loadSharedStateFromLocation() {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const shareId = url.searchParams.get("share");
  if (!shareId) return null;
  const hashPayload = url.hash?.startsWith("#") ? url.hash.slice(1) : "";
  if (hashPayload) { try { return parseSharePayload(hashPayload); } catch { return loadSharedResult(shareId); } }
  return loadSharedResult(shareId);
}
function setBrowserView(view, mode = "push") {
  if (typeof window === "undefined") return;
  window.history[mode === "replace" ? "replaceState" : "pushState"]({ appView: view }, "", window.location.href);
}

export default function App() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState("idle");
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(() => loadSharedStateFromLocation());
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [activeQuickAction, setActiveQuickAction] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [lastAnalyzedUrl, setLastAnalyzedUrl] = useState("");
  const [analysisCache, setAnalysisCache] = usePersistentState(GEMINI_CONFIG.storageKeys.analysisCache, {});
  const [repoHistory, setRepoHistory] = usePersistentState(GEMINI_CONFIG.storageKeys.repoHistory, []);
  const logRef = useAutoScroll(logs);
  const chatRef = useAutoScroll(chatHistory);
  const analysisAbortRef = useRef(null);
  const chatAbortRef = useRef(null);
  const lastHistoryViewRef = useRef(result ? "result" : "home");
  const overallHealth = useMemo(() => getOverallHealth(result?.health_scores), [result]);

  const tabs = [
    { id: "overview",   label: "Overview",       icon: "O" },
    { id: "structure",  label: "File Tree",      icon: "F" },
    { id: "entrypoint", label: "Entry Flow",     icon: "E" },
    { id: "deps",       label: "Dependencies",   icon: "D" },
    { id: "critical",   label: "Critical Files", icon: "C" },
    { id: "health",     label: "Health Score",   icon: "H" },
    { id: "chat",       label: "Ask the Repo",   icon: "Q", highlight: true },
  ];

  const addLog = (type, text) =>
    setLogs(p => [...p, { type, text, time: getNow(), id: Date.now() + Math.random() }]);

  const resetArtifacts = () => {
    setChatHistory([]); setChatInput("");
    setActiveQuickAction(""); setShareStatus("");
  };

  const persistAnalysis = (analysis, sourceUrl) => {
    setAnalysisCache(p => ({
      ...p,
      [analysis.repo_name]: { sourceUrl, lastViewed: new Date().toLocaleString("en-IN"), result: analysis },
    }));
    setRepoHistory(p =>
      [{ repo_name: analysis.repo_name, summary: analysis.summary, sourceUrl, lastViewed: new Date().toLocaleString("en-IN") },
       ...p.filter(i => i.repo_name !== analysis.repo_name)].slice(0, 8)
    );
  };

  const showResult = (analysis, nextUrl, mode = "push") => {
    setResult(analysis); setPhase("ready"); setTab("overview");
    setLastAnalyzedUrl(nextUrl); resetArtifacts();
    if (lastHistoryViewRef.current !== "result" || mode === "replace") {
      setBrowserView("result", mode); lastHistoryViewRef.current = "result";
    }
  };

  const handleAnalyze = async ({ useCache = true, retryUrl } = {}) => {
    const nextUrl = (retryUrl || url).trim();
    if (!nextUrl) return;
    let repoMeta;
    try { repoMeta = parseRepoUrl(nextUrl); } catch (err) { setError(err.message); return; }
    const cached = analysisCache[repoMeta.repoKey];
    if (useCache && cached?.result) {
      showResult(cached.result, cached.sourceUrl || nextUrl);
      setError(null); addLog("success", \`Loaded cached analysis for \${repoMeta.repoKey}.\`); return;
    }
    analysisAbortRef.current?.abort();
    const controller = new AbortController();
    analysisAbortRef.current = controller;
    setPhase("analyzing"); setError(null); setResult(null); setLogs([]);
    setLastAnalyzedUrl(nextUrl); resetArtifacts();
    try {
      const analysis = await analyzeRepository({ url: nextUrl, signal: controller.signal, onLog: addLog });
      showResult(analysis, nextUrl);
      persistAnalysis(analysis, nextUrl);
    } catch (err) {
      if (err.name === "AbortError") { setError("Analysis canceled."); setPhase("idle"); }
      else { setError(err.message || "Analysis failed."); addLog("error", err.message || "Analysis failed."); setPhase("error"); }
    }
  };

  const handleSendChat = async (question = chatInput) => {
    const q = question.trim();
    if (!q || !result || chatLoading) return;
    chatAbortRef.current?.abort();
    const controller = new AbortController(); chatAbortRef.current = controller;
    if (question === chatInput) setChatInput("");
    setChatLoading(true); setChatHistory(p => [...p, { role: "user", text: q }]);
    try {
      const answer = await askRepoQuestion({ question: q, repoContext: result, signal: controller.signal });
      setChatHistory(p => [...p, { role: "ai", text: answer }]);
    } catch (err) {
      setChatHistory(p => [...p, { role: "ai", text: err.name === "AbortError" ? "Canceled." : \`Error: \${err.message}\`, isErr: true }]);
    } finally { setChatLoading(false); }
  };

  const handleQuickAction = async (actionId) => {
    if (!result) return;
    chatAbortRef.current?.abort();
    const controller = new AbortController(); chatAbortRef.current = controller;
    setActiveQuickAction(actionId); setTab("chat"); setChatLoading(true);
    try {
      const answer = await runQuickAction({ actionId, repoContext: result, signal: controller.signal });
      setChatHistory(p => [...p, { role: "user", text: actionId }, { role: "ai", text: answer }]);
    } catch (err) {
      setChatHistory(p => [...p, { role: "ai", text: \`Error: \${err.message}\`, isErr: true }]);
    } finally { setChatLoading(false); setActiveQuickAction(""); }
  };

  const handleExplainFile = async (file) => {
    if (!result) return;
    chatAbortRef.current?.abort();
    const controller = new AbortController(); chatAbortRef.current = controller;
    try {
      const answer = await explainFile({ file, repoContext: result, signal: controller.signal });
      setChatHistory(p => [...p, { role: "ai", text: \`📄 \${file}\\n\\n\${answer}\` }]);
      setTab("chat");
    } catch (err) {
      if (err.name !== "AbortError") setChatHistory(p => [...p, { role: "ai", text: err.message, isErr: true }]);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    const shareId = saveShareResult(result);
    const shareUrl = buildShareUrl(shareId, result);
    await copyText(shareUrl);
    setShareStatus("Shareable report link copied.");
    window.setTimeout(() => setShareStatus(""), 2500);
  };

  const resetToLanding = () => {
    setResult(null); setUrl(""); setLogs([]); setError(null); setPhase("idle"); resetArtifacts();
    if (lastHistoryViewRef.current !== "home") { setBrowserView("home"); lastHistoryViewRef.current = "home"; }
  };

  const handleSelectHistory = (item) => {
    const nextUrl = item.sourceUrl || \`https://github.com/\${item.repo_name}\`;
    setUrl(nextUrl); handleAnalyze({ useCache: true, retryUrl: nextUrl });
  };

  useEffect(() => {
    const shared = loadSharedStateFromLocation();
    if (shared) { setResult(shared); setPhase("ready"); setTab("overview"); setBrowserView("result", "replace"); lastHistoryViewRef.current = "result"; return; }
    setBrowserView("home", "replace"); lastHistoryViewRef.current = "home";
  }, []);

  useEffect(() => {
    const onPop = (e) => {
      const v = e.state?.appView || "home"; lastHistoryViewRef.current = v;
      if (v === "home") { setResult(null); setError(null); setPhase("idle"); resetArtifacts(); return; }
      if (v === "result" && !result && lastAnalyzedUrl) handleAnalyze({ useCache: true, retryUrl: lastAnalyzedUrl });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [lastAnalyzedUrl, result]);

  const T = theme;
  return (
    <div style={{ fontFamily: "'Geist',-apple-system,sans-serif", background: T.bg, minHeight: "100vh", color: T.text }}>
      <style>{\`
        \${fonts}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:\${T.surface}}
        ::-webkit-scrollbar-thumb{background:\${T.border};border-radius:3px}
        @keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}
        @keyframes glowIn{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
        .res-in{animation:glowIn 0.45s ease both}
        .gh-btn{background:\${T.greenBorder};border:1px solid #2ea043;color:#fff;border-radius:8px;padding:8px 18px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.15s;display:inline-flex;align-items:center;gap:7px}
        .gh-btn:hover:not(:disabled){filter:brightness(1.15)}
        .gh-btn:disabled{opacity:.45;cursor:not-allowed}
        .gh-input{background:\${T.surface};border:1px solid \${T.border};color:\${T.text};border-radius:8px;padding:10px 12px;font-size:14px;font-family:'Geist Mono',monospace;width:100%}
        .gh-input:focus{outline:none;border-color:\${T.blue};box-shadow:0 0 0 3px \${T.blueBg}40}
        .gh-tab{background:transparent;border:1px solid transparent;color:\${T.textMuted};padding:10px 14px;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;border-radius:8px 8px 0 0;display:flex;align-items:center;gap:8px;white-space:nowrap}
        .gh-tab:hover{color:\${T.text};background:\${T.surfaceHover}}
        .gh-tab.active{color:\${T.text};border-color:\${T.border};border-bottom:1px solid \${T.bg};background:\${T.bg};margin-bottom:-1px}
        .gh-tab.highlight-tab{color:\${T.green}}
        .gh-card{background:\${T.surface};border:1px solid \${T.border};border-radius:12px}
        .row-hover:hover{background:\${T.surfaceHover}}
        .spinning{animation:spin 0.85s linear infinite;width:13px;height:13px;border:2px solid rgba(255,255,255,0.2);border-top:2px solid #fff;border-radius:50%;display:inline-block;flex-shrink:0}
      \`}</style>

      <header style={{ background:"#010409", borderBottom:\`1px solid \${T.border}\`, padding:"0 24px", height:62, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:200 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <CILogo size={32} />
          <span style={{ color:T.text, fontWeight:700, fontSize:15 }}>
            {APP_NAME.split(".")[0]}
            <span style={{ background:"linear-gradient(90deg,#3fb950,#58a6ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              .{APP_NAME.split(".")[1]}
            </span>
          </span>
          <span style={{ background:T.greenBg, color:T.green, border:\`1px solid \${T.greenBorder}\`, borderRadius:20, padding:"1px 9px", fontSize:10, fontWeight:700, fontFamily:"'Geist Mono',monospace" }}>
            {APP_VERSION}
          </span>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"flex-end" }}>
          {["Cache","Share","Quick Actions","Health Score","Ask the Repo"].map(c => (
            <span key={c} style={{ fontSize:10, padding:"2px 8px", borderRadius:999, background:T.surface, border:\`1px solid \${T.border}\`, color:T.green, fontFamily:"'Geist Mono',monospace", fontWeight:600 }}>{c}</span>
          ))}
        </div>
      </header>

      <div style={{ maxWidth:1180, margin:"0 auto", padding:"32px 20px 48px" }}>
        {!result && phase !== "analyzing" ? (
          <>
            <div style={{ textAlign:"center", marginBottom:36 }}>
              <div style={{ position:"relative", maxWidth:980, margin:"0 auto 22px", padding:"10px 24px 26px", overflow:"hidden" }}>
                <div style={{ position:"absolute", inset:"12px 12% auto", height:180, background:"radial-gradient(circle, rgba(88,166,255,0.24), rgba(13,17,23,0) 68%)", filter:"blur(8px)", pointerEvents:"none" }} />
                <div style={{ position:"relative", display:"inline-flex", alignItems:"center", gap:8, background:"linear-gradient(90deg, rgba(13,68,41,0.95), rgba(12,45,107,0.75))", border:\`1px solid \${T.greenBorder}\`, borderRadius:999, padding:"7px 16px", marginBottom:22 }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:T.green, display:"inline-block", animation:"blink 2s ease-in-out infinite" }} />
                  <span style={{ fontSize:11, color:"#9ff5ae", fontWeight:700, letterSpacing:"0.08em", fontFamily:"'Geist Mono',monospace" }}>AI-POWERED CODEBASE INTELLIGENCE</span>
                </div>
                <div style={{ position:"relative", marginBottom:16, fontSize:"clamp(46px,7vw,88px)", fontWeight:900, letterSpacing:"-0.06em", lineHeight:0.95, background:"linear-gradient(90deg,#9be7ff 0%,#58a6ff 38%,#78a6ff 64%,#bc8cff 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                  {APP_NAME}
                </div>
                <div style={{ width:120, height:1, margin:"0 auto 18px", background:"linear-gradient(90deg,rgba(63,185,80,0),rgba(88,166,255,0.95),rgba(188,140,255,0))" }} />
                <h1 style={{ fontSize:"clamp(20px,2.2vw,34px)", fontWeight:700, letterSpacing:"-0.035em", lineHeight:1.2, marginBottom:20, color:T.text, maxWidth:760, marginInline:"auto" }}>
                  Understand repos faster,<br /><span style={{ color:"#f3f7fb" }}>and demo them like a product.</span>
                </h1>
                <p style={{ color:T.textMuted, fontSize:"clamp(15px,1.5vw,18px)", maxWidth:680, margin:"0 auto", lineHeight:1.9 }}>
                  Analyze public GitHub repos · cache reports · ask cited questions · trace flows · explain files · share with one link.
                </p>
              </div>
            </div>

            <div className="gh-card" style={{ padding:20, marginBottom:18 }}>
              <div style={{ fontSize:10, fontFamily:"'Geist Mono',monospace", color:T.textDim, marginBottom:9, letterSpacing:"0.1em", textTransform:"uppercase" }}>$ GitHub Repository URL</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <div style={{ flex:1, position:"relative", minWidth:280 }}>
                  <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:T.textDim, fontFamily:"'Geist Mono',monospace", fontSize:14 }}>#</span>
                  <input className="gh-input" value={url} onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && phase !== "analyzing" && handleAnalyze()}
                    placeholder="https://github.com/owner/repository"
                    disabled={phase === "analyzing"} style={{ paddingLeft:30 }} />
                </div>
                <button className="gh-btn" onClick={() => handleAnalyze()} disabled={phase === "analyzing" || !url.trim()}>
                  {phase === "analyzing"
                    ? <><span className="spinning" /><span>Analyzing...</span></>
                    : <><CILogo size={16} /><span>Analyze</span></>}
                </button>
                {lastAnalyzedUrl
                  ? <button className="gh-btn" style={{ background:T.blueBorder, borderColor:T.blueBorder }}
                      onClick={() => handleAnalyze({ useCache:false, retryUrl:lastAnalyzedUrl })}>Retry Fresh</button>
                  : null}
              </div>
              <div style={{ display:"flex", gap:6, marginTop:12, flexWrap:"wrap", alignItems:"center" }}>
                <span style={{ fontSize:10, color:T.textDim, fontFamily:"'Geist Mono',monospace" }}>Try →</span>
                {EXAMPLE_REPOS.map(repo => (
                  <button key={repo} onClick={() => setUrl(\`https://github.com/\${repo}\`)}
                    style={{ background:T.surface, border:\`1px solid \${T.border}\`, borderRadius:999, padding:"5px 10px", color:T.textMuted, fontSize:11, fontFamily:"'Geist Mono',monospace", cursor:"pointer" }}>
                    {repo}
                  </button>
                ))}
              </div>
            </div>

            <RepoHistory items={repoHistory} onSelect={handleSelectHistory} />
            {error ? <ErrorState error={error} onClear={() => setError(null)} /> : null}
          </>
        ) : null}

        {(phase === "analyzing" || logs.length > 0) && !result ? (
          <div className="gh-card" style={{ padding:20, marginBottom:20, fontFamily:"'Geist Mono',monospace" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, paddingBottom:12, borderBottom:\`1px solid \${T.border}\` }}>
              <span style={{ fontSize:11, color:T.textMuted }}>agent — analysis.log</span>
              {phase === "analyzing" ? <span style={{ marginLeft:"auto", fontSize:10, color:T.textDim }}>running</span> : null}
            </div>
            <div ref={logRef} style={{ maxHeight:210, overflowY:"auto" }}>
              {logs.map((entry, i) => <LogLine key={entry.id} entry={entry} idx={i} />)}
            </div>
          </div>
        ) : null}

        {result ? (
          <ResultView
            result={result} overallHealth={overallHealth} tabs={tabs} tab={tab} setTab={setTab}
            handleExplainFile={handleExplainFile} activeQuickAction={activeQuickAction}
            handleQuickAction={handleQuickAction} chatHistory={chatHistory} chatLoading={chatLoading}
            chatInput={chatInput} setChatInput={setChatInput} handleSendChat={handleSendChat}
            activeApiKey="server-managed" handleShare={handleShare} shareStatus={shareStatus}
            lastAnalyzedUrl={lastAnalyzedUrl} handleAnalyze={handleAnalyze}
            resetToLanding={resetToLanding} chatRef={chatRef}
          />
        ) : null}

        {!result && phase === "idle" && !error ? <LandingFeatureGrid /> : null}
      </div>

      <footer style={{ borderTop:\`1px solid \${T.border}\`, padding:"18px 28px", marginTop:48, display:"flex", justifyContent:"space-between", alignItems:"center", background:"#010409", gap:12, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <CILogo size={20} />
          <span style={{ fontSize:12, color:T.textDim, fontFamily:"'Geist Mono',monospace" }}>
            {APP_NAME.toUpperCase()} · POWERED BY GEMINI 2.5 FLASH · SECURE
          </span>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {["Secure","Cached","Shareable","Fast"].map(c => (
            <span key={c} style={{ fontSize:10, color:T.green, fontFamily:"'Geist Mono',monospace", fontWeight:700 }}>{c}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}
`);

// ── .env.local ───────────────────────────────────────────────────────
if (!fs.existsSync(".env.local")) {
  write(".env.local", "GEMINI_API_KEY=paste_your_key_here\n");
  console.log("\n⚠  Open .env.local and replace 'paste_your_key_here' with your real Gemini key");
  console.log("   Get it free at: https://aistudio.google.com");
} else {
  console.log("✓ .env.local already exists");
}

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  Setup complete!");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("\n  Next steps:");
console.log("  1. Add your Gemini key to .env.local");
console.log("  2. Run: npm run dev");
console.log("  3. Open: http://localhost:3000\n");
