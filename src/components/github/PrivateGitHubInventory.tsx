import { useState } from "react";
import { ExternalLink, LockKeyhole, RefreshCw } from "lucide-react";
import {
  getPrivateGitHubInventory, type GitHubPrivateInventory,
} from "@/lib/githubPrivateInventory.functions";

export default function PrivateGitHubInventory() {
  const [result, setResult] = useState<GitHubPrivateInventory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setLoading(true); setError(null);
    try { setResult(await getPrivateGitHubInventory()); }
    catch {
      setResult(null);
      setError("Private GitHub access is unavailable. Configure Cloudflare Access and server-side GitHub tokens.");
    } finally { setLoading(false); }
  };
  return <section className="mt-8 space-y-3 rounded-2xl border border-slate-700 bg-slate-900/75 p-4 sm:p-6" aria-label="Authenticated private GitHub repositories">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><LockKeyhole size={18} /> Private GitHub repositories</h2>
        <p className="mt-1 max-w-2xl text-xs text-slate-300">Private names and URLs are fetched only after Cloudflare Access authentication. GitHub API permissions are separate from the accounts connected to ChatGPT.</p>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/50 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-slate-800">
        <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> {loading ? "Connecting…" : "Load authorized inventory"}
      </button>
    </div>
    {error && <p role="alert" className="text-xs text-amber-200">{error}</p>}
    {result && <div aria-live="polite" className="text-xs text-slate-300">
      <strong>{result.repositories.length} observed private repos</strong> · {result.connectedAccounts.length} configured accounts · {result.truthState.toUpperCase()} · fetched {new Date(result.fetchedAt).toLocaleString()}
      {result.errors.map((msg,i) => <p key={i} className="mt-2 text-amber-200">{msg}</p>)}
      {result.truthState === "not_connected" && <p className="mt-2 text-amber-200">No server-side GitHub connector configured. No private resources were exposed.</p>}
    </div>}
    {result && result.repositories.length > 0 && <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {result.repositories.map(repo => <article key={repo.url} className="min-w-0 rounded-xl border border-slate-700 p-3 text-sm">
        <p className="text-xs text-sky-300">{repo.owner} · Private</p>
        <h3 className="mt-1 break-all font-semibold">{repo.name}</h3>
        <p className="mt-1 text-xs text-slate-400">{repo.description || "No description provided"}</p>
        <p className="mt-2 text-xs text-slate-400">Branch: {repo.defaultBranch || "Unknown"} · Last push: {repo.pushedAt ? new Date(repo.pushedAt).toLocaleDateString() : "Unknown"}{repo.archived ? " · Archived" : ""}</p>
        <a href={repo.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-300">Open private repo <ExternalLink size={11} /></a>
      </article>)}
    </div>}
  </section>;
}
