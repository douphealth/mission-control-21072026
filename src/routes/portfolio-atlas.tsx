import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  PUBLIC_PORTFOLIO_REPOS,
  PORTFOLIO_CATEGORIES,
} from "@/lib/portfolioAtlas";
import {
  GITHUB_ACCOUNT_AUDIT,
  GITHUB_ACCOUNT_AUDIT_DATE,
} from "@/lib/portfolioAtlasSnapshot";

export const Route = createFileRoute("/portfolio-atlas")({
  head: () => ({ meta: [{ title: "Portfolio Atlas | Mission Control" }] }),
  component: PortfolioAtlas,
});

const totals = GITHUB_ACCOUNT_AUDIT.reduce(
  (acc, a) => ({
    all: acc.all + a.total,
    public: acc.public + a.public,
    private: acc.private + a.private,
  }),
  { all: 0, public: 0, private: 0 },
);

function PortfolioAtlas() {
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("all");
  const [category, setCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(48);
  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return PUBLIC_PORTFOLIO_REPOS.filter(r =>
      (owner === "all" || r.owner === owner) &&
      (category === "all" || r.category === category) &&
      (term === "" || [r.name, r.owner, r.description, r.category]
        .join(" ").toLocaleLowerCase().includes(term)),
    );
  }, [query, owner, category]);
  const shown = matches.slice(0, visibleCount);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <Link to="/" className="text-sm font-medium text-sky-300 hover:underline">
          ← Mission Control
        </Link>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">Read-only portfolio inventory</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Portfolio Atlas</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              GitHub account snapshot from {GITHUB_ACCOUNT_AUDIT_DATE}. Inventory does not prove that a
              project is live, healthy, deployed, or monetized.
            </p>
          </div>
          <p className="text-xs text-slate-400">Source: connected GitHub API audit · No live app sync</p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3" aria-label="Inventory totals">
          {[
            { label: "Repositories audited", value: totals.all },
            { label: "Public searchable", value: totals.public },
            { label: "Private protected", value: totals.private },
          ].map(item => (
            <div key={item.label} className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3 sm:p-5">
              <p className="text-2xl font-extrabold tabular-nums sm:text-3xl">{item.value}</p>
              <p className="mt-1 text-xs text-slate-300">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {GITHUB_ACCOUNT_AUDIT.map(a => (
            <div key={a.owner} className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
              <p className="break-all text-sm font-semibold">{a.owner}</p>
              <p className="mt-1 text-xs text-slate-400">{a.total} audited · {a.public} public · {a.private} private</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-100" role="note">
          Private repository identifiers are intentionally excluded from this client-side view.
          This snapshot is not a GitHub OAuth connection inside Mission Control. Full private
          inventory requires authenticated server-side access. Cloudflare deployment is not verified.
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Categories are inferred from repository names, not confirmed features. Descriptions and app links
          for douphealth are previously recorded planning metadata, not fresh deployment checks.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.4fr)_minmax(12rem,0.4fr)]">
          <input
            type="search"
            aria-label="Search public repositories"
            value={query}
            onChange={e => { setQuery(e.target.value); setVisibleCount(48); }}
            placeholder="Search repos, categories, descriptions…"
            className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
          />
          <select
            aria-label="Filter by GitHub account"
            value={owner}
            onChange={e => { setOwner(e.target.value); setVisibleCount(48); }}
            className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-sky-400"
          >
            <option value="all">All three accounts</option>
            {GITHUB_ACCOUNT_AUDIT.map(a => <option key={a.owner} value={a.owner}>{a.owner}</option>)}
          </select>
          <select
            aria-label="Filter by topic"
            value={category}
            onChange={e => { setCategory(e.target.value); setVisibleCount(48); }}
            className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-sky-400"
          >
            <option value="all">All topics</option>
            {PORTFOLIO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <p className="my-4 text-sm text-slate-300" aria-live="polite">
          {matches.length} public repositories match · Showing {shown.length}
        </p>
        {shown.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 p-8 text-center text-slate-300">
            No matching public repositories. Try another search or filter.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map(r => (
              <article key={r.url.toLocaleLowerCase()} className="flex min-w-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-sky-300">{r.owner}</span>
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-300">{r.category}</span>
                </div>
                <h2 className="mt-3 break-words text-base font-bold">{r.name}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
                  {r.description || "Purpose and operational status not independently verified."}
                </p>
                <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:underline">
                    GitHub ↗
                  </a>
                  {r.recordedAppUrl && (
                    <a href={r.recordedAppUrl} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:underline">
                      Recorded app URL ↗
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        {shown.length < matches.length && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount(n => n + 48)}
              className="rounded-xl border border-sky-400/50 bg-slate-900 px-6 py-3 text-sm font-bold text-sky-200 hover:bg-slate-800"
            >
              Show more ({matches.length - shown.length} remaining)
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
