export type RepositoryOverview = { fullName: string; description: string; language: string | null; stars: number; forks: number; openItems: number; defaultBranch: string; sizeKb: number; pushedAt: string | null; archived: boolean; visibility: string; homepage: string | null; fetchedAt: string };
export function repositoryIdentity(value: string) { const u = new URL(value), parts = u.pathname.replace(/\.git$/, "").split("/").filter(Boolean); if (u.protocol !== "https:" || u.hostname !== "github.com" || u.username || u.password || parts.length !== 2 || parts.some(part => !/^[a-zA-Z0-9_.-]+$/.test(part))) throw new Error("Use a GitHub URL in owner/repository form."); return { owner: parts[0], repo: parts[1], url: `https://github.com/${parts.join("/")}` }; }
const cache = new Map<string, RepositoryOverview>(), pending = new Map<string, Promise<RepositoryOverview>>(); let cooldownUntil = 0;
export async function readRepositoryOverview(value: string): Promise<RepositoryOverview> {
  const identity = repositoryIdentity(value), key = identity.url, cached = cache.get(key);
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < 300_000) return cached;
  if (pending.has(key)) return pending.get(key)!;
  if (Date.now() < cooldownUntil) throw new Error("GitHub is rate limiting requests. Previous metadata is retained; try later.");
  const operation = (async () => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const r = await fetch(`https://api.github.com/repos/${identity.owner}/${identity.repo}`, { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10" }, signal: controller.signal, credentials: "omit" });
      if ([403, 429].includes(r.status)) {
        const reset = Number(r.headers.get("x-ratelimit-reset")) * 1000, retry = Number(r.headers.get("retry-after")) * 1000;
        cooldownUntil = Math.max(Date.now() + (Number.isFinite(retry) ? retry : 0), Date.now() + 60_000, r.headers.get("x-ratelimit-remaining") === "0" && Number.isFinite(reset) ? reset : 0);
        throw new Error("GitHub denied or rate-limited the request. No saved fields were changed.");
      }
      if (r.status === 404) throw new Error("Repository is private, renamed or unavailable to the public API. Open GitHub using your account.");
      if (!r.ok) throw new Error(`GitHub returned HTTP ${r.status}. Previous metadata is retained.`);
      const row = await r.json();
      if (String(row.full_name).toLowerCase() !== `${identity.owner}/${identity.repo}`.toLowerCase()) throw new Error("GitHub returned a different repository identity; check whether it was renamed.");
      const count = (n: unknown) => { if (!Number.isSafeInteger(n) || Number(n) < 0) throw new Error("GitHub returned invalid counters."); return Number(n); };
      const result: RepositoryOverview = { fullName: row.full_name, description: String(row.description || ""), language: row.language || null, stars: count(row.stargazers_count), forks: count(row.forks_count), openItems: count(row.open_issues_count), defaultBranch: String(row.default_branch), sizeKb: count(row.size), pushedAt: row.pushed_at || null, archived: row.archived === true, visibility: String(row.visibility || "public"), homepage: typeof row.homepage === "string" && /^https?:\/\//i.test(row.homepage) ? row.homepage : null, fetchedAt: new Date().toISOString() };
      if (cache.size >= 200) cache.clear(); cache.set(key, result); return result;
    } finally { clearTimeout(timer); }
  })().finally(() => pending.delete(key)); pending.set(key, operation); return operation;
}
