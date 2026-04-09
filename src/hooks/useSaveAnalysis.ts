import { useState } from "react";
import { useSession } from "next-auth/react";

export function useSaveAnalysis() {
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveAnalysis(payload: {
    repoUrl: string;
    repoName: string;
    summary: string;
    analysisJson: unknown;
  }) {
    if (!session) {
      setError("Sign in to save analyses");
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/analyze/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
    } catch (e) {
      setError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return { saveAnalysis, saving, saved, error };
}
