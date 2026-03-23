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
      setError(null); addLog("success", `Loaded cached analysis for ${repoMeta.repoKey}.`); return;
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
      setChatHistory(p => [...p, { role: "ai", text: err.name === "AbortError" ? "Canceled." : `Error: ${err.message}`, isErr: true }]);
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
      setChatHistory(p => [...p, { role: "ai", text: `Error: ${err.message}`, isErr: true }]);
    } finally { setChatLoading(false); setActiveQuickAction(""); }
  };

  const handleExplainFile = async (file) => {
    if (!result) return;
    chatAbortRef.current?.abort();
    const controller = new AbortController(); chatAbortRef.current = controller;
    try {
      const answer = await explainFile({ file, repoContext: result, signal: controller.signal });
      setChatHistory(p => [...p, { role: "ai", text: `📄 ${file}\n\n${answer}` }]);
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
    const nextUrl = item.sourceUrl || `https://github.com/${item.repo_name}`;
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
      <style>{`
        ${fonts}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:${T.surface}}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
        @keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}
        @keyframes glowIn{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
        .res-in{animation:glowIn 0.45s ease both}
        .gh-btn{background:${T.greenBorder};border:1px solid #2ea043;color:#fff;border-radius:8px;padding:8px 18px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.15s;display:inline-flex;align-items:center;gap:7px}
        .gh-btn:hover:not(:disabled){filter:brightness(1.15)}
        .gh-btn:disabled{opacity:.45;cursor:not-allowed}
        .gh-input{background:${T.surface};border:1px solid ${T.border};color:${T.text};border-radius:8px;padding:10px 12px;font-size:14px;font-family:'Geist Mono',monospace;width:100%}
        .gh-input:focus{outline:none;border-color:${T.blue};box-shadow:0 0 0 3px ${T.blueBg}40}
        .gh-tab{background:transparent;border:1px solid transparent;color:${T.textMuted};padding:10px 14px;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;border-radius:8px 8px 0 0;display:flex;align-items:center;gap:8px;white-space:nowrap}
        .gh-tab:hover{color:${T.text};background:${T.surfaceHover}}
        .gh-tab.active{color:${T.text};border-color:${T.border};border-bottom:1px solid ${T.bg};background:${T.bg};margin-bottom:-1px}
        .gh-tab.highlight-tab{color:${T.green}}
        .gh-card{background:${T.surface};border:1px solid ${T.border};border-radius:12px}
        .row-hover:hover{background:${T.surfaceHover}}
        .spinning{animation:spin 0.85s linear infinite;width:13px;height:13px;border:2px solid rgba(255,255,255,0.2);border-top:2px solid #fff;border-radius:50%;display:inline-block;flex-shrink:0}
        
        /* Mobile responsive badges - right side only */
        @media (max-width: 768px) {
          .navbar-badges { display: none !important; }
        }
      `}</style>

      <header style={{ background:"#010409", borderBottom:`1px solid ${T.border}`, padding:"0 24px", height:62, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:200 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <CILogo size={32} />
          <span style={{ color:T.text, fontWeight:700, fontSize:15 }}>
            {APP_NAME.split(".")[0]}
            <span style={{ background:"linear-gradient(90deg,#3fb950,#58a6ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              .{APP_NAME.split(".")[1]}
            </span>
          </span>
          <span style={{ background:T.greenBg, color:T.green, border:`1px solid ${T.greenBorder}`, borderRadius:20, padding:"1px 9px", fontSize:10, fontWeight:700, fontFamily:"'Geist Mono',monospace" }}>
            {APP_VERSION}
          </span>
        </div>
        <div className="navbar-badges" style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"flex-end" }}>
          {["Cache","Share","Quick Actions","Health Score","Ask the Repo"].map(c => (
            <span key={c} style={{ fontSize:10, padding:"2px 8px", borderRadius:999, background:T.surface, border:`1px solid ${T.border}`, color:T.green, fontFamily:"'Geist Mono',monospace", fontWeight:600 }}>{c}</span>
          ))}
        </div>
      </header>

      <div style={{ maxWidth:1180, margin:"0 auto", padding:"32px 20px 48px" }}>
        {!result && phase !== "analyzing" ? (
          <>
            <div style={{ textAlign:"center", marginBottom:36 }}>
              <div style={{ position:"relative", maxWidth:980, margin:"0 auto 22px", padding:"10px 24px 26px", overflow:"hidden" }}>
                <div style={{ position:"absolute", inset:"12px 12% auto", height:180, background:"radial-gradient(circle, rgba(88,166,255,0.24), rgba(13,17,23,0) 68%)", filter:"blur(8px)", pointerEvents:"none" }} />
                <div style={{ position:"relative", display:"inline-flex", alignItems:"center", gap:8, background:"linear-gradient(90deg, rgba(13,68,41,0.95), rgba(12,45,107,0.75))", border:`1px solid ${T.greenBorder}`, borderRadius:999, padding:"7px 16px", marginBottom:22 }}>
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
                  <button key={repo} onClick={() => setUrl(`https://github.com/${repo}`)}
                    style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:999, padding:"5px 10px", color:T.textMuted, fontSize:11, fontFamily:"'Geist Mono',monospace", cursor:"pointer" }}>
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
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, paddingBottom:12, borderBottom:`1px solid ${T.border}` }}>
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

      <footer style={{ borderTop:`1px solid ${T.border}`, padding:"18px 28px", marginTop:48, display:"flex", justifyContent:"space-between", alignItems:"center", background:"#010409", gap:12, flexWrap:"wrap" }}>
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
