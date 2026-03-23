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
