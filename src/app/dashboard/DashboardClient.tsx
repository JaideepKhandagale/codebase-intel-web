"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  GitForkIcon,
  Trash2Icon,
  ExternalLinkIcon,
  LogOutIcon,
  LayoutDashboardIcon,
} from "lucide-react";

type Analysis = {
  id: string;
  repoUrl: string;
  repoName: string;
  summary: string;
  createdAt: Date | string;
};

type Props = {
  user: { name: string; email: string; image: string | null };
  analyses: Analysis[];
};

export default function DashboardClient({ user, analyses: initial }: Props) {
  const router = useRouter();
  const [analyses, setAnalyses] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/analyses/${id}`, { method: "DELETE" });
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
    setDeleting(null);
  }

  function openAnalysis(repoUrl: string) {
    // redirect to main page with the repo URL pre-filled
    // adjust the query param name to match your existing app
    router.push(`/?repo=${encodeURIComponent(repoUrl)}`);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboardIcon className="w-5 h-5 text-blue-400" />
          <span className="font-semibold text-lg">Codebase.intel</span>
        </div>
        <div className="flex items-center gap-4">
          {user.image && (
            <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
          )}
          <span className="text-sm text-gray-400">{user.name}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition"
          >
            <LogOutIcon className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Saved Analyses</h1>
          <p className="text-gray-400 text-sm mt-1">
            {analyses.length === 0
              ? "No saved analyses yet."
              : `${analyses.length} saved repo${analyses.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {analyses.length === 0 ? (
          <EmptyState onAnalyze={() => router.push("/")} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analyses.map((a) => (
              <AnalysisCard
                key={a.id}
                analysis={a}
                deleting={deleting === a.id}
                onOpen={() => openAnalysis(a.repoUrl)}
                onDelete={() => handleDelete(a.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AnalysisCard({
  analysis,
  deleting,
  onOpen,
  onDelete,
}: {
  analysis: Analysis;
  deleting: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const date = new Date(analysis.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3 hover:border-gray-700 transition">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <GitForkIcon className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="font-mono text-sm text-blue-400 truncate">
            {analysis.repoName}
          </span>
        </div>
        <span className="text-xs text-gray-500 shrink-0">{date}</span>
      </div>

      <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
        {analysis.summary}
      </p>

      <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-800">
        <button
          onClick={onOpen}
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition"
        >
          <ExternalLinkIcon className="w-3.5 h-3.5" />
          Re-analyze
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition ml-auto disabled:opacity-50"
        >
          <Trash2Icon className="w-3.5 h-3.5" />
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onAnalyze }: { onAnalyze: () => void }) {
  return (
    <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl">
      <GitForkIcon className="w-10 h-10 text-gray-700 mx-auto mb-4" />
      <p className="text-gray-400 mb-4">
        No saved analyses yet. Analyze a repo and hit Save.
      </p>
      <button
        onClick={onAnalyze}
        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
      >
        Analyze a Repo
      </button>
    </div>
  );
}
