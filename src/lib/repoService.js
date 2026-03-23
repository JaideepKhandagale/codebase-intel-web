import { callAnalyzeAPI, generateText, geminiGenerateContent } from "./gemini";
import { extractOutputText, normalizeAnalysis, repairJSON } from "./normalize";

export function parseRepoUrl(url) {
  const clean = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
  const match = clean.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
  if (!match) throw new Error("Invalid GitHub URL. Try: github.com/owner/repo");
  return {
    clean,
    owner: match[1],
    repo: match[2].replace(/\.git$/i, ""),
    repoKey: `${match[1]}/${match[2].replace(/\.git$/i, "")}`,
  };
}

async function repairJSONWithAI(raw, signal) {
  const data = await geminiGenerateContent({
    input: `Convert this broken JSON into valid JSON only. Return a single JSON object, no markdown.\n\n${raw}`,
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
  onLog?.("search", `Researching ${repoKey} with live web search...`);
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
    input: `You are a codebase expert. Answer using only the analysis provided. Be concise, under 180 words. Cite file paths when relevant.

Repository Analysis:
${JSON.stringify(repoContext, null, 2)}

Question: ${question}`,
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
    question: `Explain the role of ${file}. Cover why it matters, what it depends on, and what changes here could break.`,
    repoContext,
    signal,
  });
}
