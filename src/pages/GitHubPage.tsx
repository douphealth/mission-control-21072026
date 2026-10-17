import RepoCommandCard from "@/components/github/RepoCommandCard";
import { db } from "@/lib/db";
import { useRepos, useBulkDeleteItems, useBulkAddItems, useBulkPatch, useAddItem, useUpdateItem } from "@/hooks/useTableData";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  ExternalLink,
  Star,
  GitFork,
  Edit2,
  Search,
  Rocket,
  Code2,
  CheckSquare,
  Database,
  List,
  LayoutGrid,
  SlidersHorizontal,
  Globe2,
  GitBranch,
  Link2,
  ShieldCheck,
  ServerCog,
  FolderGit2,
  ArrowUpRight,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import FormModal, {
  FormField,
  FormInput,
  FormTextarea,
  FormSelect,
  FormTagsInput,
} from "@/components/FormModal";
import type { GitHubRepo } from "@/lib/db";
import { useBulkActions } from "@/hooks/useBulkActions";
import BulkActionBar from "@/components/BulkActionBar";
import ConfirmDialog, { useConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import {
  GITHUB_REPO_CATALOG,
  GITHUB_REPO_CATALOG_COUNT,
  GITHUB_REPO_CATALOG_GENERATED_AT,
} from "@/lib/repoCatalog";
import { REPO_PORTFOLIO_META } from "@/lib/repoPortfolioMeta";
import { REPO_RELATIONSHIPS } from "@/lib/repoRelationships";
import { REPO_MASTER_LINKS } from "@/lib/repoMasterLinks";

const langColors: Record<string, string> = {
  TypeScript: "bg-blue-500",
  JavaScript: "bg-yellow-400",
  Python: "bg-blue-400",
  PHP: "bg-purple-500",
  HTML: "bg-orange-500",
  Go: "bg-sky-400",
  Rust: "bg-orange-600",
  Ruby: "bg-red-500",
};

const DB_TYPES = [
  { value: "", label: "None" },
  { value: "supabase", label: "🟢 Supabase" },
  { value: "firebase", label: "🔥 Firebase" },
  { value: "neon", label: "⚡ Neon" },
  { value: "planetscale", label: "🪐 PlanetScale" },
  { value: "railway", label: "🚂 Railway" },
  { value: "mongodb", label: "🍃 MongoDB" },
  { value: "postgres", label: "🐘 PostgreSQL" },
  { value: "mysql", label: "🐬 MySQL" },
  { value: "other", label: "📦 Other" },
];

const emptyRepo: Omit<GitHubRepo, "id"> = {
  name: "",
  url: "",
  description: "",
  language: "TypeScript",
  stars: 0,
  forks: 0,
  status: "active",
  demoUrl: "",
  progress: 0,
  topics: [],
  lastUpdated: new Date().toISOString().split("T")[0],
  devPlatformUrl: "",
  deploymentUrl: "",
  dbType: undefined,
  dbUrl: "",
  dbDashboardUrl: "",
  dbName: "",
  dbNotes: "",
};

export default function GitHubPage() {
  const repos = useRepos();
  const deleteRecords = useBulkDeleteItems();
  const bulkAddItems = useBulkAddItems();
  const bulkPatch = useBulkPatch();
  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const catalogSeeded = useRef(false);
  const catalogSynced = useRef(false);
  const canonicalAppsRepaired = useRef(false);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [portfolioFilter, setPortfolioFilter] = useState<"all" | "live" | "core" | "origin" | "repo-only">("all");
  const [compactView, setCompactView] = useState(false);
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editCatalogName, setEditCatalogName] = useState<string | null>(null);
  const [form, setForm] = useState(emptyRepo);
  const bulk = useBulkActions<GitHubRepo>();
  const cd = useConfirmDialog();

  useEffect(() => {
    if (catalogSeeded.current) return;
    catalogSeeded.current = true;
    void (async () => {
      const stored = await db.repos.toArray();
      const existing = new Set(stored.flatMap(repo => [repo.url?.toLowerCase(), repo.name.toLowerCase()].filter(Boolean)));
      const missing = GITHUB_REPO_CATALOG.filter(repo => !existing.has(repo.url.toLowerCase()) && !existing.has(repo.name.toLowerCase()));
      if (missing.length) await bulkAddItems("repos", missing);
    })().catch(() => { catalogSeeded.current = false; toast.error("Could not load the GitHub catalog. Existing records were preserved."); });
  }, [bulkAddItems]);

  useEffect(() => {
    if (catalogSynced.current || repos.length === 0) return;

    const catalogByUrl = new Map(GITHUB_REPO_CATALOG.map((r) => [r.url.toLowerCase(), r]));
    const catalogByName = new Map(GITHUB_REPO_CATALOG.map((r) => [r.name.toLowerCase(), r]));
    // Only technical catalog metadata is synchronized after seeding.
    // User-managed planning fields (priority, importance, done/pending, status,
    // progress) must remain editable and must never be overwritten on mount.
    const syncFields = ["visibility", "defaultBranch", "repoSizeKb", "metadataCheckedAt"] as const;

    const updates = repos.flatMap((repo) => {
      const catalog =
        catalogByUrl.get(repo.url?.toLowerCase()) ?? catalogByName.get(repo.name.toLowerCase());
      if (!catalog || (repo.metadataCheckedAt || "") >= (catalog.metadataCheckedAt || "")) return [];

      const patch: Partial<GitHubRepo> = {};
      for (const field of syncFields) {
        if (repo[field] !== catalog[field]) {
          (patch as Record<string, unknown>)[field] = catalog[field];
        }
      }
      return Object.keys(patch).length > 0 ? [{ id: repo.id, patch }] : [];
    });

    catalogSynced.current = true;
    if (updates.length > 0) {
      void Promise.all(updates.map(({ id, patch }) => bulkPatch("repos", [id], patch))).catch(
        (error) => {
          catalogSynced.current = false;
          console.error("Could not synchronize GitHub portfolio metadata", error);
          toast.error("Could not synchronize GitHub portfolio priorities.");
        },
      );
    }
  }, [repos, bulkPatch]);

  const displayRepos = useMemo(() => {
    const localByUrl = new Map(repos.map((r) => [r.url?.toLowerCase(), r]));
    const localByName = new Map(repos.map((r) => [r.name.toLowerCase(), r]));

    const matched = new Set<string>();
    const catalogRows = GITHUB_REPO_CATALOG.map((catalog, index) => {
      const local =
        localByUrl.get(catalog.url.toLowerCase()) ?? localByName.get(catalog.name.toLowerCase());
      if (local) matched.add(local.id);
      return {
        id: local?.id ?? `catalog-${index}-${catalog.name}`,
        ...catalog,
        ...(local ?? {}),
        // Canonical identity must never be inherited from a stale/corrupt local row.
        name: catalog.name,
        url: catalog.url,
        priority: local?.priority ?? catalog.priority,
        importance: local?.importance ?? catalog.importance,
      } as GitHubRepo;
    });
    return [...catalogRows, ...repos.filter(repo => !matched.has(repo.id))];
  }, [repos]);

  const filtered = useMemo(() => {
    const priorityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const q = search.trim().toLowerCase();
    return displayRepos
      .filter((r) => {
        const meta = REPO_PORTFOLIO_META[r.name];
        const master = REPO_MASTER_LINKS[r.name];
        const relationships = REPO_RELATIONSHIPS[r.name] || [];
        const state = meta?.portfolioState || master?.s || "REPO ONLY / NOT PROVEN LIVE";
        const portfolioMatch =
          portfolioFilter === "all" ||
          (portfolioFilter === "live" && (meta?.directWebsiteApp || state.includes("LIVE APP"))) ||
          (portfolioFilter === "core" && state.includes("WEBSITE CORE")) ||
          (portfolioFilter === "origin" && state.includes("ORIGIN CANDIDATE")) ||
          (portfolioFilter === "repo-only" && state.includes("REPO ONLY"));

        const haystack = [
          r.name,
          r.description,
          r.doneSummary,
          r.pendingSummary,
          meta?.portfolioState,
          meta?.category,
          meta?.nextAction,
          meta?.evidence,
          master?.s,
          master?.h,
          master?.m,
          master?.a,
          ...(master?.u || []),
          ...(master?.p || []),
          ...(master?.c || []),
          ...(master?.l || []),
          ...(master?.z || []),
          ...(meta?.parentWebsites || []),
          ...(meta?.productionUrls || []),
          ...(meta?.pagesUrls || []),
          ...(meta?.githubPagesUrls || []),
          ...(meta?.candidateUrls || []),
          ...relationships.flatMap((relationship) => [
            relationship.appName,
            relationship.parentWebsite,
            relationship.connectionType,
            relationship.aliasUrl,
            relationship.canonicalUrl,
            relationship.pagesUrl,
            relationship.githubPagesUrl,
            relationship.candidateUrl,
            relationship.hosting,
            relationship.evidenceStatus,
            relationship.liveStatus,
            relationship.nextAction,
          ]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          (priorityFilter === "all" || (r.priority || "medium") === priorityFilter) &&
          portfolioMatch &&
          (!q || haystack.includes(q))
        );
      })
      .sort(
        (a, b) =>
          (priorityRank[a.priority || "medium"] ?? 2) -
            (priorityRank[b.priority || "medium"] ?? 2) ||
          (b.importance || 0) - (a.importance || 0) ||
          a.name.localeCompare(b.name),
      );
  }, [displayRepos, search, priorityFilter, portfolioFilter]);

  const portfolioStats = useMemo(() => {
    const states = displayRepos.map((repo) => {
      const meta = REPO_PORTFOLIO_META[repo.name];
      const master = REPO_MASTER_LINKS[repo.name];
      return {
        direct: !!meta?.directWebsiteApp,
        state: meta?.portfolioState || master?.s || "REPO ONLY / NOT PROVEN LIVE",
      };
    });
    return {
      total: displayRepos.length,
      live: states.filter(({ direct, state }) =>
        direct ||
        state.includes("LIVE APP") ||
        state.toLowerCase().includes("deployed / domain linked") ||
        state.toLowerCase().includes("public live"),
      ).length,
      core: states.filter(({ state }) => state.includes("WEBSITE CORE")).length,
      origin: states.filter(({ state }) =>
        state.includes("ORIGIN CANDIDATE") || state.toLowerCase().includes("needs origin proof"),
      ).length,
      repoOnly: states.filter(({ state }) => state.toLowerCase().includes("repo only")).length,
    };
  }, [displayRepos]);

  const openEdit = (r: GitHubRepo) => {
    const persisted = repos.find(
      (local) =>
        local.url?.toLowerCase() === r.url.toLowerCase() ||
        local.name.toLowerCase() === r.name.toLowerCase(),
    );
    setEditId(persisted?.id ?? null);
    setEditCatalogName(r.name);
    const { id, ...rest } = r;
    setForm(rest);
    setModalOpen(true);
  };
  const saveForm = async () => {
    if (!form.name.trim()) return;
    try {
    if (editId) {
      await updateItem<GitHubRepo>("repos", editId, form);
    } else if (editCatalogName) {
      await addItem<GitHubRepo>("repos", form);
    } else {
      await addItem<GitHubRepo>("repos", form);
    }

    setModalOpen(false);
    setEditId(null);
    setEditCatalogName(null);
    toast.success("Repository saved");
    } catch { toast.error("Repository was not saved. Your edits are still in the dialog."); }
  };
  const uf = (field: keyof typeof form, val: any) => setForm((f) => ({ ...f, [field]: val }));

  const bulkDelete = useCallback(() => {
    if (bulk.selectedCount === 0) return;
    cd.confirm({
      title: `Delete ${bulk.selectedCount} Repo(s)`,
      description: `This removes ${bulk.selectedCount} saved portfolio records from this app. It does not delete repositories on GitHub.`,
      onConfirm: async () => {
        await deleteRecords("repos", repos.filter(r => bulk.selectedIds.has(r.id)).map(r => r.id));
        toast.success(`${bulk.selectedCount} repos deleted`);
        bulk.clearSelection();
      },
    });
  }, [bulk, repos, deleteRecords, cd]);

  const bulkUpdateStatus = useCallback(
    async (status: string) => {
      await bulkPatch("repos", repos.filter(r => bulk.selectedIds.has(r.id)).map(r => r.id), { status });
      toast.success(`${bulk.selectedCount} repos updated`);
      bulk.clearSelection();
    },
    [bulk, repos, bulkPatch],
  );

  return (
    <div className="space-y-4 sm:space-y-5 mc-print-github-page">
      <section className="relative overflow-hidden rounded-[28px] border border-border/40 bg-card/80 p-4 shadow-sm backdrop-blur-xl sm:p-5">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary">
              <FolderGit2 size={11} /> Portfolio command center
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              GitHub Projects
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {GITHUB_REPO_CATALOG_COUNT} catalog repositories checked on {GITHUB_REPO_CATALOG_GENERATED_AT} · production relationships and URLs layered from the portfolio control workbook.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {[
              { label: "Repos", value: portfolioStats.total },
              { label: "App URLs", value: portfolioStats.live },
              { label: "Site core", value: portfolioStats.core },
              { label: "Origin gaps", value: portfolioStats.origin },
              { label: "Repo only", value: portfolioStats.repoOnly },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border/35 bg-background/55 px-3 py-2.5 text-center">
                <div className="text-lg font-extrabold tabular-nums text-foreground">{stat.value}</div>
                <div className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2">
          <button
            onClick={bulk.toggleBulkMode}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${bulk.bulkMode ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-border/30 bg-secondary/50 text-muted-foreground hover:text-foreground"}`}
          >
            <CheckSquare size={14} /> {bulk.bulkMode ? "Exit bulk mode" : "Bulk edit"}
          </button>
          <span className="rounded-xl border border-success/15 bg-success/8 px-3 py-2 text-[10px] font-bold text-success">
            {GITHUB_REPO_CATALOG_COUNT} SNAPSHOT REPOSITORIES
          </span>
          <span className="rounded-xl border border-border/30 bg-secondary/40 px-3 py-2 text-[10px] font-semibold text-muted-foreground">
            GitHub technical snapshot {GITHUB_REPO_CATALOG_GENERATED_AT}
          </span>
          <span className="rounded-xl border border-blue-500/15 bg-blue-500/8 px-3 py-2 text-[10px] font-semibold text-blue-600 dark:text-blue-300">
            GitHub = technical truth · Mission Control = editable planning truth
          </span>
        </div>
      </section>

      {bulk.bulkMode && (
        <BulkActionBar
          selectedCount={bulk.selectedCount}
          totalCount={filtered.length}
          onSelectAll={() => bulk.selectAll(filtered)}
          allSelected={bulk.selectedCount === filtered.length && filtered.length > 0}
          onDelete={bulkDelete}
          dropdowns={[
            {
              label: "Set Status...",
              onSelect: bulkUpdateStatus,
              options: [
                { value: "active", label: "✅ Active" },
                { value: "stable", label: "🟢 Stable" },
                { value: "paused", label: "⏸️ Paused" },
                { value: "archived", label: "📦 Archived" },
              ],
            },
          ]}
        />
      )}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center bg-secondary rounded-xl px-3 py-2 gap-2 w-full lg:max-w-sm">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search 81 repositories..."
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCompactView((v) => !v)}
            className="shrink-0 rounded-xl border border-border/30 bg-card/60 p-2 text-muted-foreground transition hover:text-foreground"
            title={compactView ? "Switch to detailed cards" : "Switch to compact cards"}
          >
            {compactView ? <LayoutGrid size={14} /> : <List size={14} />}
          </button>
          {(["all", "critical", "high", "medium", "low"] as const).map((priority) => {
            const count =
              priority === "all"
                ? displayRepos.length
                : displayRepos.filter((repo) => (repo.priority || "medium") === priority).length;
            return (
              <button
                key={priority}
                type="button"
                onClick={() => setPriorityFilter(priority)}
                className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  priorityFilter === priority
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/30 bg-card/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {priority} <span className="ml-1 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {([
          ["all", "All assets", portfolioStats.total],
          ["live", "Production apps", portfolioStats.live],
          ["core", "Website core", portfolioStats.core],
          ["origin", "Origin proof", portfolioStats.origin],
          ["repo-only", "Repo only", portfolioStats.repoOnly],
        ] as const).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            onClick={() => setPortfolioFilter(value)}
            className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${portfolioFilter === value ? "border-primary/30 bg-primary/10 text-primary" : "border-border/30 bg-card/60 text-muted-foreground hover:text-foreground"}`}
          >
            {label} <span className="ml-1 opacity-65">{count}</span>
          </button>
        ))}
      </div>

      <section className="mc-print-data" aria-label="Printable GitHub repositories"><h2>Repository register</h2><p className="mc-print-meta">{filtered.length} matching repositories · All matching records included (not limited to the current card page)</p><table><thead><tr><th>Repository / URL</th><th>Priority</th><th>Status</th><th>Progress</th><th>Next action</th></tr></thead><tbody>{filtered.map(repo=><tr key={repo.id}><td><strong>{repo.name}</strong><small className="mc-print-url">{repo.url}</small>{repo.description && <small>{repo.description}</small>}</td><td>{repo.priority||"—"}</td><td>{repo.status}</td><td>{Number.isFinite(repo.progress) ? repo.progress+"%" : "—"}</td><td>{repo.pendingSummary || "Not recorded"}</td></tr>)}</tbody></table></section>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" aria-label="GitHub repository cards">{filtered.slice(Math.min(page, Math.max(0, Math.ceil(filtered.length / 12) - 1)) * 12, (Math.min(page, Math.max(0, Math.ceil(filtered.length / 12) - 1)) + 1) * 12).map(repo => <RepoCommandCard key={repo.id} repo={repo} compact={compactView} bulkMode={bulk.bulkMode} selected={bulk.isSelected(repo.id)} onSelect={() => bulk.toggleSelect(repo.id)} onEdit={() => openEdit(repo)} />)}</div>
      {!filtered.length && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm">No repositories match these filters.</div>}
      <div className="flex items-center justify-between text-sm"><span>{filtered.length} repositories / page {Math.min(page + 1, Math.max(1, Math.ceil(filtered.length / 12)))} of {Math.max(1, Math.ceil(filtered.length / 12))}</span><div className="flex gap-2"><button className="min-h-11 rounded-xl border border-border px-3 disabled:opacity-40" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</button><button className="min-h-11 rounded-xl border border-border px-3 disabled:opacity-40" disabled={(page + 1) * 12 >= filtered.length} onClick={() => setPage(value => value + 1)}>Next</button></div></div>
      <p className="text-xs text-muted-foreground">Plan status and app URLs are saved references, not live health checks. Refresh queries public GitHub metadata for that repository only; no code is changed. Private repositories need your GitHub account.</p>

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId || editCatalogName ? "Edit Repository" : "Add Repository"}
        onSubmit={saveForm}
      >
        <FormField label="Repo Name *">
          <FormInput
            value={form.name}
            onChange={(v) => uf("name", v)}
            placeholder="my-awesome-repo"
          />
        </FormField>
        <FormField label="GitHub URL">
          <FormInput
            value={form.url}
            onChange={(v) => uf("url", v)}
            placeholder="https://github.com/user/repo"
          />
        </FormField>
        <FormField label="Description">
          <FormTextarea
            value={form.description}
            onChange={(v) => uf("description", v)}
            placeholder="What does this repo do?"
            rows={2}
          />
        </FormField>
        <FormField label="Done / Current State">
          <FormTextarea
            value={form.doneSummary || ""}
            onChange={(v) => uf("doneSummary", v)}
            placeholder="What is already complete and working?"
            rows={3}
          />
        </FormField>
        <FormField label="Pending / Next Action">
          <FormTextarea
            value={form.pendingSummary || ""}
            onChange={(v) => uf("pendingSummary", v)}
            placeholder="What is missing or should happen next?"
            rows={3}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <FormField label="Language">
            <FormSelect
              value={form.language}
              onChange={(v) => uf("language", v)}
              options={[
                "TypeScript",
                "JavaScript",
                "Python",
                "PHP",
                "HTML",
                "Go",
                "Rust",
                "Ruby",
              ].map((l) => ({ value: l, label: l }))}
            />
          </FormField>
          <FormField label="Status">
            <FormSelect
              value={form.status}
              onChange={(v) => uf("status", v as any)}
              options={[
                { value: "active", label: "Active" },
                { value: "stable", label: "Stable" },
                { value: "paused", label: "Paused" },
                { value: "archived", label: "Archived" },
              ]}
            />
          </FormField>
          <FormField label="Priority">
            <FormSelect
              value={form.priority || "medium"}
              onChange={(v) => uf("priority", v as any)}
              options={[
                { value: "critical", label: "Critical" },
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low" },
              ]}
            />
          </FormField>
          <FormField label="Importance (0-100)">
            <FormInput
              value={String(form.importance ?? 50)}
              onChange={(v) => uf("importance", Math.max(0, Math.min(100, parseInt(v) || 0)))}
              type="number"
            />
          </FormField>
          <FormField label="Stars">
            <FormInput
              value={String(form.stars)}
              onChange={(v) => uf("stars", parseInt(v) || 0)}
              type="number"
            />
          </FormField>
          <FormField label="Progress %">
            <FormInput
              value={String(form.progress)}
              onChange={(v) => uf("progress", Math.min(100, parseInt(v) || 0))}
              type="number"
            />
          </FormField>
        </div>
        <FormField label="Demo URL">
          <FormInput
            value={form.demoUrl}
            onChange={(v) => uf("demoUrl", v)}
            placeholder="https://demo.example.com"
          />
        </FormField>
        <FormField label="Dev Platform URL">
          <FormInput
            value={form.devPlatformUrl || ""}
            onChange={(v) => uf("devPlatformUrl", v)}
            placeholder="https://github.com/..., https://example.com/..."
          />
        </FormField>
        <FormField label="Deployment Gateway URL">
          <FormInput
            value={form.deploymentUrl || ""}
            onChange={(v) => uf("deploymentUrl", v)}
            placeholder="https://vercel.com/..., cloudways.com/..., netlify.app/..."
          />
        </FormField>
        <FormField label="Topics">
          <FormTagsInput
            value={form.topics}
            onChange={(v) => uf("topics", v)}
            placeholder="Add topic and press Enter"
          />
        </FormField>
        {/* Database Connection */}
        <div className="border-t border-border/30 pt-4 mt-2">
          <div className="flex items-center gap-2 mb-3">
            <Database size={14} className="text-primary" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Database Connection
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <FormField label="DB Type">
              <FormSelect
                value={form.dbType || ""}
                onChange={(v) => uf("dbType", v || undefined)}
                options={DB_TYPES}
              />
            </FormField>
            <FormField label="DB Name">
              <FormInput
                value={form.dbName || ""}
                onChange={(v) => uf("dbName", v)}
                placeholder="my-project-db"
              />
            </FormField>
          </div>
          {form.dbType && (
            <>
              <FormField label="DB URL / Connection String">
                <FormInput
                  value={form.dbUrl || ""}
                  onChange={(v) => uf("dbUrl", v)}
                  placeholder={
                    form.dbType === "supabase" ? "https://xxxxx.supabase.co" : "postgresql://..."
                  }
                />
              </FormField>
              <FormField label="DB Dashboard URL">
                <FormInput
                  value={form.dbDashboardUrl || ""}
                  onChange={(v) => uf("dbDashboardUrl", v)}
                  placeholder={
                    form.dbType === "supabase"
                      ? "https://supabase.com/dashboard/project/xxxxx"
                      : "https://..."
                  }
                />
              </FormField>
              <FormField label="DB Notes">
                <FormTextarea
                  value={form.dbNotes || ""}
                  onChange={(v) => uf("dbNotes", v)}
                  placeholder="API keys, special config notes..."
                  rows={2}
                />
              </FormField>
            </>
          )}
        </div>
      </FormModal>

      <ConfirmDialog {...cd.dialogProps} />
    </div>
  );
}
