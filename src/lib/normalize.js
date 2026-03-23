function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value
    .replace(/[\u0000-\u0008\u000B-\u001F]/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/[â€¢â€”â€¦]/g, (char) => ({ "â€¢": "-", "â€”": "-", "â€¦": "..." }[char] || char))
    .trim();
}

export function extractOutputText(data) {
  const chunks = [];
  for (const candidate of data?.candidates || []) {
    for (const part of candidate?.content?.parts || []) {
      if (typeof part?.text === "string" && part.text.trim()) chunks.push(part.text);
    }
  }
  return cleanText(chunks.join("\n").trim());
}

export function repairJSON(raw) {
  let text = cleanText(raw)
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in the analysis response.");

  const end = text.lastIndexOf("}");
  text = text.slice(start, end > start ? end + 1 : undefined);

  try {
    return JSON.parse(text);
  } catch {
    // Continue with conservative repair.
  }

  let fixed = text
    .replace(/,?\s*"[^"]*"?\s*:\s*$/, "")
    .replace(/,\s*$/, "")
    .replace(/,\s*([}\]])/g, "$1");

  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escaping = false;

  for (const char of fixed) {
    if (escaping) {
      escaping = false;
      continue;
    }
    if (char === "\\" && inString) {
      escaping = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") braces += 1;
    if (char === "}") braces -= 1;
    if (char === "[") brackets += 1;
    if (char === "]") brackets -= 1;
  }

  while (brackets > 0) {
    fixed += "]";
    brackets -= 1;
  }
  while (braces > 0) {
    fixed += "}";
    braces -= 1;
  }

  try {
    return JSON.parse(fixed);
  } catch {
    throw new Error("The model returned malformed analysis JSON. Retrying usually fixes it.");
  }
}

function normalizeScore(value, fallback = 60) {
  const num = Number(value);
  if (Number.isNaN(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function normalizeList(items, mapper, limit) {
  return asArray(items)
    .map(mapper)
    .filter(Boolean)
    .slice(0, limit);
}

export function buildDerivedRisks(result) {
  const risks = [];
  const scores = result.health_scores || {};

  if ((scores.testability ?? 100) < 65) {
    risks.push({
      title: "Low testability score",
      severity: "high",
      detail: "This repo may be harder to change safely because test coverage or test isolation looks weak.",
    });
  }
  if ((scores.documentation ?? 100) < 65) {
    risks.push({
      title: "Thin documentation",
      severity: "medium",
      detail: "Onboarding and maintenance may depend too much on reading source directly.",
    });
  }
  if ((scores.modularity ?? 100) < 65) {
    risks.push({
      title: "Tight coupling",
      severity: "high",
      detail: "Core flows may span too many files or responsibilities, which raises regression risk.",
    });
  }
  if ((result.critical_files || []).length >= 6) {
    risks.push({
      title: "Many critical files",
      severity: "medium",
      detail: "A large set of high-importance files suggests broad blast radius for changes.",
    });
  }

  return risks.slice(0, 5);
}

export function normalizeAnalysis(raw, fallbackRepo = "owner/repo") {
  const result = raw && typeof raw === "object" ? raw : {};
  const healthScores = result.health_scores || {};

  const normalized = {
    repo_name: cleanText(result.repo_name, fallbackRepo),
    summary: cleanText(result.summary, "Repository analysis is available, but the summary came back incomplete."),
    tech_stack: normalizeList(result.tech_stack, (item) => cleanText(item), 8),
    architecture_style: cleanText(result.architecture_style, "Unknown"),
    language: cleanText(result.language, "Unknown"),
    folder_structure: normalizeList(
      result.folder_structure,
      (item) =>
        item?.path
          ? {
              path: cleanText(item.path),
              purpose: cleanText(item.purpose, "Purpose not described."),
              type: cleanText(item.type, "other").toLowerCase(),
            }
          : null,
      10
    ),
    entry_point: {
      file: cleanText(result.entry_point?.file, "Not identified"),
      description: cleanText(result.entry_point?.description, "Entry flow was not described."),
      execution_flow: normalizeList(result.entry_point?.execution_flow, (item) => cleanText(item), 7),
    },
    dependency_map: normalizeList(
      result.dependency_map,
      (item) =>
        item?.file
          ? {
              file: cleanText(item.file),
              role: cleanText(item.role, "Role not described."),
              depends_on: normalizeList(item.depends_on, (dep) => cleanText(dep), 6),
            }
          : null,
      10
    ),
    critical_files: normalizeList(
      result.critical_files,
      (item) =>
        item?.file
          ? {
              file: cleanText(item.file),
              role: cleanText(item.role, "No reason provided."),
              importance: cleanText(item.importance, "medium").toLowerCase(),
            }
          : null,
      10
    ),
    key_design_decisions: normalizeList(result.key_design_decisions, (item) => cleanText(item), 6),
    health_scores: {
      documentation: normalizeScore(healthScores.documentation, 65),
      architecture: normalizeScore(healthScores.architecture, 70),
      testability: normalizeScore(healthScores.testability, 60),
      modularity: normalizeScore(healthScores.modularity, 65),
    },
  };

  normalized.risks = normalizeList(
    result.risks,
    (item) =>
      item?.title
        ? {
            title: cleanText(item.title),
            severity: cleanText(item.severity, "medium").toLowerCase(),
            detail: cleanText(item.detail, "No detail provided."),
          }
        : null,
    5
  );

  if (!normalized.risks.length) normalized.risks = buildDerivedRisks(normalized);

  normalized.quick_files = [
    ...normalized.critical_files.map((item) => item.file),
    ...normalized.dependency_map.map((item) => item.file),
  ]
    .filter((file, index, list) => file && list.indexOf(file) === index)
    .slice(0, 8);

  return normalized;
}
