import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GITHUB_REPO_CATALOG } from "@/lib/repoCatalog";
import { PAPALEXIOS_PUBLIC_REPO_NAMES } from "@/lib/portfolioAtlasSnapshot";

export const Route = createFileRoute("/portfolio-atlas")({
  component: PortfolioAtlas,
});
const repos = [
  ...GITHUB_REPO_CATALOG.map(r => ({ owner: "douphealth", name: r.name, url: r.url, description: r.description || "", app: r.demoUrl || "" })),
  ...PAPALEXIOS_PUBLIC_REPO_NAMES.map(name => ({ owner: "Papalexios", name, url: "https://github.com/Papalexios/" + encodeURIComponent(name), description: "", app: "" })),
];
function PortfolioAtlas() {
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("all");
  const matches = useMemo(() => repos.filter(r => (owner === "all" || r.owner === owner) && [r.name, r.owner, r.description].join(" ").toLocaleLowerCase().includes(query.toLocaleLowerCase())), [query, owner]);
  return <main className="min-h-screen bg-slate-950 p-6 text-white">
    <div className="mx-auto max-w-6xl">
      <Link to="/" className="text-sky-300">← Mission Control</Link>
      <h1 className="mt-8 text-4xl font-bold">Portfolio Atlas</h1>
      <p className="mt-3 text-slate-300">{repos.length} public GitHub repositories in dated snapshots. Read-only; not a live sync.</p>
      <p className="mt-3 rounded-xl border border-amber-600/30 p-4 text-amber-200">papalexios001 and Cloudflare accounts are not authenticated or inventoried. Private repositories are not included.</p>
      <div className="my-6 flex flex-wrap gap-3">
        <input aria-label="Search repositories" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search repositories…" className="min-w-0 flex-1 rounded-lg bg-slate-800 p-3" />
        <select aria-label="GitHub owner" value={owner} onChange={e => setOwner(e.target.value)} className="rounded-lg bg-slate-800 p-3">
          <option value="all">All accounts</option><option value="douphealth">douphealth</option><option value="Papalexios">Papalexios</option>
        </select>
      </div>
      <p className="mb-4 text-slate-300">{matches.length} matches</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map(r => <article key={r.url} className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <p className="text-xs text-sky-300">{r.owner}</p><h2 className="mt-2 break-all text-lg font-bold">{r.name}</h2>
          <p className="mt-2 text-sm text-slate-300">{r.description || "Purpose not verified."}</p>
          <div className="mt-4 flex gap-4"><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sky-300">GitHub ↗</a>
          {r.app && <a href={r.app} target="_blank" rel="noopener noreferrer" className="text-emerald-300">Recorded app ↗</a>}</div>
        </article>)}
      </div>
    </div>
  </main>;
}