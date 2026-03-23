import { theme } from "./theme";

export function exportPDF(result) {
  const win = window.open("", "_blank");
  if (!win) return;

  const healthScores = result.health_scores || {};
  const scoreValues = Object.values(healthScores);
  const overall = scoreValues.length ? Math.round(scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length) : 0;
  const riskRows = (result.risks || [])
    .map((risk) => `<div style="padding:10px 0;border-bottom:1px solid #161b22"><strong style="color:#ff7b72">${risk.severity.toUpperCase()}</strong> ${risk.title}<div style="color:#8b949e;font-size:12px;margin-top:4px">${risk.detail}</div></div>`)
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>${result.repo_name} Report</title><style>*{box-sizing:border-box}body{font-family:-apple-system,'Segoe UI',sans-serif;background:${theme.bg};color:${theme.text};padding:40px;max-width:960px;margin:0 auto;line-height:1.6}.card{background:${theme.surface};border:1px solid ${theme.border};border-radius:12px;padding:20px;margin-bottom:18px}.row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mono{font-family:ui-monospace,SFMono-Regular,monospace}.muted{color:${theme.textMuted}}</style></head><body><div class="card"><div class="mono" style="color:${theme.blue};font-size:24px;font-weight:700">${result.repo_name}</div><div class="muted" style="margin-top:6px">${result.summary}</div></div><div class="row"><div class="card"><div class="muted">Architecture</div><div class="mono">${result.architecture_style}</div></div><div class="card"><div class="muted">Overall health</div><div class="mono" style="font-size:24px">${overall}/100</div></div></div><div class="card"><div class="mono" style="margin-bottom:10px">Entry flow</div>${(result.entry_point?.execution_flow || []).map((step, index) => `<div>${index + 1}. ${step}</div>`).join("")}</div><div class="card"><div class="mono" style="margin-bottom:10px">Critical files</div>${(result.critical_files || []).map((file) => `<div><strong>${file.file}</strong> <span class="muted">${file.role}</span></div>`).join("")}</div><div class="card"><div class="mono" style="margin-bottom:10px">Risk summary</div>${riskRows || `<div class="muted">No standout risks were generated for this report.</div>`}</div><script>window.onload=()=>window.print();<\/script></body></html>`;

  win.document.write(html);
  win.document.close();
}
