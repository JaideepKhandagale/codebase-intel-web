import { exportPDF } from "../lib/exporters";
import { GEMINI_CONFIG } from "../config/appConfig";
import { theme } from "../lib/theme";
import { AnalysisCard, ChatTab, CriticalTab, DependenciesTab, HealthTab, OverviewTab, QuickActions, StructureTab } from "./dashboardBits";

function EntrypointTab({ result }) {
  return <div><div style={{ marginBottom: 16 }}><div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.textDim, marginBottom: 6 }}>Execution Flow</div><div style={{ color: theme.text, fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{result.entry_point?.file}</div><div style={{ color: theme.textMuted, fontSize: 13, lineHeight: 1.6 }}>{result.entry_point?.description}</div></div><div style={{ position: "relative", paddingLeft: 30 }}><div style={{ position: "absolute", left: 10, top: 0, bottom: 0, width: 1, background: `linear-gradient(to bottom,${theme.blue}80,transparent)` }} />{(result.entry_point?.execution_flow || []).map((step, index) => <div key={`${step}-${index}`} style={{ position: "relative", marginBottom: 12 }}><div style={{ position: "absolute", left: -26, top: 10, width: 12, height: 12, borderRadius: "50%", background: theme.bg, border: `2px solid ${theme.blue}` }} /><div style={{ background: "#010409", border: `1px solid ${theme.border}`, borderRadius: 8, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}><span style={{ background: theme.blueBg, color: theme.blue, border: `1px solid ${theme.blueBorder}`, borderRadius: 4, padding: "1px 7px", fontSize: 10, fontFamily: "'Geist Mono',monospace", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{String(index + 1).padStart(2, "0")}</span><span style={{ fontSize: 13, color: theme.text, lineHeight: 1.6, fontFamily: "'Geist Mono',monospace" }}>{step}</span></div></div>)}</div></div>;
}

export default function ResultView({
  result,
  overallHealth,
  tabs,
  tab,
  setTab,
  handleExplainFile,
  activeQuickAction,
  handleQuickAction,
  chatHistory,
  chatLoading,
  chatInput,
  setChatInput,
  handleSendChat,
  activeApiKey,
  handleShare,
  shareStatus,
  lastAnalyzedUrl,
  handleAnalyze,
  resetToLanding,
  chatRef,
}) {
  return (
    <div className="res-in">
      <div className="gh-card" style={{ padding: "22px 24px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 20, padding: "1px 9px", fontSize: 11, color: theme.textMuted }}>Public</span>
              <span style={{ background: theme.greenBg, border: `1px solid ${theme.greenBorder}`, borderRadius: 20, padding: "1px 9px", fontSize: 11, color: theme.green, fontWeight: 700 }}>Analyzed</span>
              {overallHealth ? <span style={{ background: overallHealth >= 80 ? theme.greenBg : overallHealth >= 60 ? "#2d2000" : theme.redBg, border: `1px solid ${overallHealth >= 80 ? theme.greenBorder : overallHealth >= 60 ? "#6e5200" : "#6e1313"}`, borderRadius: 20, padding: "1px 9px", fontSize: 11, color: overallHealth >= 80 ? theme.green : overallHealth >= 60 ? theme.yellow : theme.red, fontWeight: 700 }}>Health: {overallHealth}/100</span> : null}
              <span style={{ background: theme.surfaceSoft, border: `1px solid ${theme.border}`, borderRadius: 20, padding: "1px 9px", fontSize: 11, color: theme.textMuted }}>Cached locally</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: theme.blue, fontFamily: "'Geist Mono',monospace", marginBottom: 8 }}>{result.repo_name}</h2>
            <p style={{ color: theme.textMuted, fontSize: 14, lineHeight: 1.8, maxWidth: 720, marginBottom: 12 }}>{result.summary}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: theme.orange, display: "inline-block" }} />
              <span style={{ fontSize: 13, color: theme.text, fontWeight: 600, marginRight: 6 }}>{result.language}</span>
              {(result.tech_stack || []).map((item) => <span key={item} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 20, padding: "1px 9px", fontSize: 11, color: theme.textMuted, fontFamily: "'Geist Mono',monospace" }}>{item}</span>)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="gh-btn" style={{ background: theme.surface, color: theme.text, borderColor: theme.border }} onClick={() => exportPDF(result)}>Export PDF</button>
            <button className="gh-btn" style={{ background: theme.blueBorder, borderColor: theme.blueBorder }} onClick={handleShare}>Share Report</button>
          </div>
        </div>
        {shareStatus ? <div style={{ marginTop: 12, color: theme.green, fontSize: 12 }}>{shareStatus}</div> : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10, marginBottom: 18 }}>
        <AnalysisCard label="Architecture" value={result.architecture_style} color={theme.blue} />
        <AnalysisCard label="Entry Point" value={result.entry_point?.file} color={theme.green} />
        <AnalysisCard label="Critical" value={`${result.critical_files?.length || 0} files`} color={theme.red} />
        <AnalysisCard label="Modules" value={`${result.dependency_map?.length || 0} mapped`} color={theme.purple} />
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${theme.border}`, overflowX: "auto" }}>
        {tabs.map((item) => <button key={item.id} className={`gh-tab ${tab === item.id ? "active" : ""} ${item.highlight ? "highlight-tab" : ""}`} onClick={() => setTab(item.id)}><span style={{ fontSize: 12 }}>{item.icon}</span>{item.label}{item.highlight ? <span style={{ background: theme.greenBg, color: theme.green, border: `1px solid ${theme.greenBorder}`, borderRadius: 4, padding: "0 5px", fontSize: 9, fontWeight: 700 }}>NEW</span> : null}</button>)}
      </div>

      <div className="gh-card" style={{ borderTop: "none", borderRadius: "0 0 12px 12px", padding: 24, minHeight: 320 }}>
        {tab === "overview" ? <OverviewTab result={result} /> : null}
        {tab === "structure" ? <StructureTab result={result} handleExplainFile={handleExplainFile} /> : null}
        {tab === "entrypoint" ? <EntrypointTab result={result} /> : null}
        {tab === "deps" ? <DependenciesTab result={result} handleExplainFile={handleExplainFile} /> : null}
        {tab === "critical" ? <CriticalTab result={result} handleExplainFile={handleExplainFile} /> : null}
        {tab === "health" ? <HealthTab result={result} overallHealth={overallHealth} /> : null}
        {tab === "chat" ? <ChatTab result={result} chatHistory={chatHistory} chatLoading={chatLoading} chatInput={chatInput} setChatInput={setChatInput} handleSendChat={handleSendChat} activeApiKey={activeApiKey} chatRef={chatRef} /> : null}
      </div>

      <div className="gh-card" style={{ padding: "16px 18px", marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.textDim, marginBottom: 10 }}>
          Demo Actions
        </div>
        <QuickActions loadingAction={activeQuickAction} onRun={handleQuickAction} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 12, flexWrap: "wrap" }}>
        <button onClick={resetToLanding} style={{ background: "none", border: `1px solid ${theme.border}`, borderRadius: 8, padding: "8px 14px", color: theme.textMuted, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>&lt;- New Analysis</button>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="gh-btn" style={{ background: theme.surface, color: theme.text, borderColor: theme.border }} onClick={() => handleAnalyze({ useCache: false, retryUrl: lastAnalyzedUrl || `https://github.com/${result.repo_name}` })}>Refresh Live Analysis</button>
          <span style={{ fontSize: 11, color: theme.textDim, fontFamily: "'Geist Mono',monospace" }}>{GEMINI_CONFIG.analysisModel}</span>
        </div>
      </div>
    </div>
  );
}
