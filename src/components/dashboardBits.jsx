import CILogo from "./CILogo";
import { theme } from "../lib/theme";
import { DEMO_ACTIONS } from "../config/appConfig";
import { EmptyState, ImpBadge, SectionHeading, TypeBadge, HealthGauge } from "./ui";

export function AnalysisCard({ label, value, color }) {
  return (
    <div className="gh-card row-hover" style={{ padding: "12px 14px", cursor: "default", transition: "background 0.15s" }}>
      <div style={{ fontSize: 10, color: theme.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color, fontFamily: "'Geist Mono',monospace" }}>{value || "N/A"}</div>
    </div>
  );
}

export function RepoHistory({ items, onSelect }) {
  if (!items.length) return null;
  return (
    <div className="gh-card" style={{ padding: 18, marginTop: 14 }}>
      <SectionHeading eyebrow="Recent Workspaces" title="Recent analyses" subtitle="Re-open a previous report instantly from local cache." />
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => (
          <button key={item.repo_name} onClick={() => onSelect(item)} style={{ background: theme.surfaceSoft, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "12px 14px", color: theme.text, textAlign: "left", cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ color: theme.blue, fontFamily: "'Geist Mono',monospace", fontWeight: 600 }}>{item.repo_name}</span>
              <span style={{ color: theme.textDim, fontSize: 12 }}>{item.lastViewed}</span>
            </div>
            <div style={{ color: theme.textMuted, fontSize: 13, lineHeight: 1.6 }}>{item.summary}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function LandingFeatureGrid() {
  const cards = [
    { badge: "Cache", color: theme.blue, title: "Persistent Analysis Cache", desc: "Re-open recent repos instantly without repeating the same analysis call every time." },
    { badge: "Retry", color: theme.green, title: "Cancelable Pipeline", desc: "Abort long-running requests, retry fresh, and recover from malformed JSON more gracefully." },
    { badge: "Explain", color: theme.yellow, title: "Click-To-Explain Files", desc: "Use the file tree, critical files, and dependency map as a live explanation surface." },
    { badge: "Share", color: theme.purple, title: "Shareable Reports", desc: "Copy a report link with encoded analysis so demos feel like a real product, not a one-off screen." },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 8 }}>
      {cards.map((card) => (
        <div key={card.badge} className="gh-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 4, padding: "1px 7px", fontSize: 10, fontFamily: "'Geist Mono',monospace", fontWeight: 700, color: card.color }}>{card.badge}</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: theme.text }}>{card.title}</span>
          </div>
          <p style={{ fontSize: 13, color: theme.textMuted, lineHeight: 1.6 }}>{card.desc}</p>
        </div>
      ))}
    </div>
  );
}

export function InsightPanel({ title, content, loading, empty }) {
  return (
    <div style={{ background: "#010409", border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, minHeight: 160 }}>
      <div style={{ color: theme.textDim, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 11, fontWeight: 700, marginBottom: 10 }}>{title}</div>
      {loading ? <div style={{ color: theme.textMuted, fontSize: 13 }}>Thinking through the repository context...</div> : null}
      {!loading && content ? <div style={{ color: theme.text, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{content}</div> : null}
      {!loading && !content ? <div style={{ color: theme.textMuted, fontSize: 13 }}>{empty}</div> : null}
    </div>
  );
}

export function QuickActions({ loadingAction, onRun }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
      {DEMO_ACTIONS.map((action) => (
        <button key={action.id} onClick={() => onRun(action.id)} disabled={Boolean(loadingAction)} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 999, padding: "7px 12px", color: loadingAction === action.id ? theme.blue : theme.textMuted, fontSize: 12, cursor: loadingAction ? "not-allowed" : "pointer" }}>
          <span style={{ marginRight: 8, color: theme.green }}>{action.icon}</span>
          {loadingAction === action.id ? "Running..." : action.label}
        </button>
      ))}
    </div>
  );
}

export function renderRiskContent(risks) {
  return (risks || []).map((risk) => `[${risk.severity.toUpperCase()}] ${risk.title}\n${risk.detail}`).join("\n\n");
}

export function OverviewTab({ result }) {
  return <div><SectionHeading eyebrow="Design Summary" title="Key design decisions" subtitle="A concise overview of how this repository appears to be structured and why that matters." />{(result.key_design_decisions || []).map((decision, index) => <div key={`${decision}-${index}`} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: `1px solid ${theme.border}20`, alignItems: "flex-start" }}><span style={{ background: theme.blueBg, color: theme.blue, border: `1px solid ${theme.blueBorder}`, borderRadius: 4, padding: "1px 7px", fontSize: 10, fontFamily: "'Geist Mono',monospace", fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{String(index + 1).padStart(2, "0")}</span><span style={{ fontSize: 14, color: theme.text, lineHeight: 1.7 }}>{decision}</span></div>)}</div>;
}

export function StructureTab({ result, handleExplainFile }) {
  return <div><SectionHeading eyebrow="Repository Structure" title="File tree with click-to-explain" subtitle="Use this as your navigation and onboarding surface. Clicking a file generates a dedicated explanation panel above." /><div style={{ background: "#010409", border: `1px solid ${theme.border}`, borderRadius: 10, overflow: "hidden" }}>{(result.folder_structure || []).map((item) => <button key={item.path} onClick={() => handleExplainFile(item.path)} style={{ width: "100%", display: "flex", alignItems: "center", padding: "12px 14px", border: "none", borderBottom: `1px solid ${theme.border}18`, gap: 8, background: "transparent", color: theme.text, textAlign: "left", cursor: "pointer", flexWrap: "wrap" }}><span style={{ color: theme.blue, fontSize: 13, fontFamily: "'Geist Mono',monospace", minWidth: 160, fontWeight: 500 }}>{item.path}</span><TypeBadge type={item.type} /><span style={{ color: theme.textMuted, fontSize: 13, flex: 1 }}>{item.purpose}</span></button>)}</div></div>;
}

export function DependenciesTab({ result, handleExplainFile }) {
  return <div><SectionHeading eyebrow="Dependencies" title="Module map" subtitle="Click any mapped file to get a plain-English explanation and likely blast radius." />{(result.dependency_map || []).map((item) => <button key={item.file} onClick={() => handleExplainFile(item.file)} style={{ width: "100%", background: "#010409", border: `1px solid ${theme.border}`, borderRadius: 8, padding: "13px 16px", marginBottom: 8, color: theme.text, textAlign: "left", cursor: "pointer" }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: (item.depends_on || []).length ? 10 : 0, flexWrap: "wrap" }}><span style={{ color: theme.purple, fontFamily: "'Geist Mono',monospace", fontSize: 13, fontWeight: 500 }}>{item.file}</span><span style={{ color: theme.textDim }}>.</span><span style={{ color: theme.textMuted, fontSize: 13 }}>{item.role}</span></div>{(item.depends_on || []).length ? <div style={{ paddingLeft: 16, borderLeft: `2px solid ${theme.border}`, display: "flex", flexDirection: "column", gap: 4 }}>{item.depends_on.map((dependency) => <div key={dependency} style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "'Geist Mono',monospace", fontSize: 12 }}><span style={{ color: theme.border }}>|-</span><span style={{ color: theme.green }}>{dependency}</span></div>)}</div> : null}</button>)}</div>;
}

export function CriticalTab({ result, handleExplainFile }) {
  return <div><SectionHeading eyebrow="Critical Files" title="High-leverage files" subtitle="These are the strongest candidates for walkthroughs, file explanations, and risk review." />{(result.critical_files || []).map((file) => <button key={file.file} onClick={() => handleExplainFile(file.file)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: "#010409", border: `1px solid ${theme.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 8, textAlign: "left", color: theme.text, cursor: "pointer" }}><ImpBadge level={file.importance} /><div style={{ flex: 1 }}><div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12, color: theme.text, fontWeight: 500, marginBottom: 2 }}>{file.file}</div><div style={{ fontSize: 12, color: theme.textMuted }}>{file.role}</div></div></button>)}</div>;
}

export function HealthTab({ result, overallHealth }) {
  return <div><SectionHeading eyebrow="Health Score" title="Repository health and risk posture" subtitle="The score cards are still here, but now the app also surfaces derived risks you can act on immediately." /><div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 28, flexWrap: "wrap" }}><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><svg width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke={theme.border} strokeWidth="7" /><circle cx="50" cy="50" r="40" fill="none" stroke={overallHealth >= 80 ? theme.green : overallHealth >= 60 ? theme.yellow : theme.red} strokeWidth="7" strokeDasharray={`${((overallHealth || 0) / 100) * 251.2} 251.2`} strokeDashoffset="62.8" strokeLinecap="round" /><text x="50" y="54" textAnchor="middle" fill={overallHealth >= 80 ? theme.green : overallHealth >= 60 ? theme.yellow : theme.red} fontSize="22" fontWeight="800" fontFamily="'Geist Mono',monospace">{overallHealth}</text></svg><span style={{ fontSize: 12, color: overallHealth >= 80 ? theme.green : overallHealth >= 60 ? theme.yellow : theme.red, fontWeight: 700 }}>{overallHealth >= 80 ? "Excellent" : overallHealth >= 60 ? "Good" : "Needs Work"}</span></div><div style={{ flex: 1, display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>{Object.entries(result.health_scores || {}).map(([label, score]) => <HealthGauge key={label} label={label} score={score} />)}</div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>{(result.risks || []).map((risk) => <div key={risk.title} style={{ background: "#010409", border: `1px solid ${theme.border}`, borderRadius: 10, padding: 16 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><ImpBadge level={risk.severity} /><div style={{ fontWeight: 600 }}>{risk.title}</div></div><div style={{ color: theme.textMuted, fontSize: 13, lineHeight: 1.7 }}>{risk.detail}</div></div>)}</div></div>;
}

export function ChatTab({ result, chatHistory, chatLoading, chatInput, setChatInput, handleSendChat, activeApiKey, chatRef }) {
  return <div style={{ display: "flex", flexDirection: "column", height: 460 }}><SectionHeading eyebrow="Ask The Repo" title="Cited chat and demo quick actions" subtitle="Ask anything about the repository or use the quick actions above to generate onboarding, trace flows, and risk summaries." />{!chatHistory.length ? <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>{["How does authentication work?", "Where is the database config?", "What is the main request flow?", "How is error handling done?", "Which files are safest to change first?"].map((question) => <button key={question} onClick={() => setChatInput(question)} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 999, padding: "6px 11px", color: theme.textMuted, fontSize: 12, cursor: "pointer" }}>{question}</button>)}</div> : null}<div ref={chatRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 12, paddingRight: 4 }}>{chatHistory.map((message, index) => <div key={`${message.role}-${index}`} style={{ display: "flex", justifyContent: message.role === "user" ? "flex-end" : "flex-start" }}>{message.role === "ai" ? <div style={{ width: 24, height: 24, borderRadius: "50%", background: `linear-gradient(135deg,${theme.greenBorder},${theme.blueBorder})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 8, marginTop: 4 }}><CILogo size={14} /></div> : null}<div style={{ background: message.role === "user" ? theme.blueBg : theme.surface, border: `1px solid ${message.role === "user" ? theme.blueBorder : theme.border}`, borderRadius: message.role === "user" ? "10px 10px 2px 10px" : "10px 10px 10px 2px", padding: "10px 14px", maxWidth: "85%", color: message.isErr ? theme.red : message.role === "user" ? theme.blue : theme.text, fontSize: 13, lineHeight: 1.65, fontFamily: message.role === "ai" ? "'Geist Mono',monospace" : "inherit", whiteSpace: "pre-wrap" }}>{message.text}</div></div>)}{chatLoading ? <div style={{ color: theme.textMuted, fontSize: 13 }}>Thinking through the repository context...</div> : null}</div><div style={{ display: "flex", gap: 8 }}><input className="gh-input" value={chatInput} onChange={(event) => setChatInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleSendChat()} placeholder={`Ask about ${result.repo_name}...`} disabled={chatLoading || !activeApiKey} style={{ flex: 1, fontSize: 13 }} /><button className="gh-btn" style={{ background: theme.blueBorder, borderColor: theme.blueBorder }} onClick={() => handleSendChat()} disabled={!chatInput.trim() || chatLoading || !activeApiKey}>{chatLoading ? <span className="spinning" /> : "Send"}</button></div></div>;
}

export function ErrorState({ error, onClear }) {
  return <div style={{ marginTop: 16 }}><EmptyState title="Analysis needs a reset" description={error} action={<button className="gh-btn" onClick={onClear}>Clear Error</button>} /></div>;
}
