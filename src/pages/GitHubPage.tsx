import { useRepos, useUpdateData, useBulkAddItems, useBulkPatch, useAddItem, useUpdateItem } from "@/hooks/useTableData";
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
import FormModal, {
  FormField,
  FormInput,
  FormTextarea,
  FormSelect,
  FormTagsInput,
} from "@/components/FormModal";
import type { GitHubRepo } from "@/lib/store";
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
  const updateData = useUpdateData();
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
  const [compactView, setCompactView] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editCatalogName, setEditCatalogName] = useState<string | null>(null);
  const [form, setForm] = useState(emptyRepo);
  const bulk = useBulkActions<GitHubRepo>();
  const cd = useConfirmDialog();

  useEffect(() => {
    if (catalogSeeded.current) return;
    const existing = new Set(
      repos.flatMap((r) => [r.url?.toLowerCase(), r.name?.toLowerCase()].filter(Boolean) as string[]),
    );
    const missing = GITHUB_REPO_CATALOG.filter(
      (r) => !existing.has(r.url.toLowerCase()) && !existing.has(r.name.toLowerCase()),
    );
    catalogSeeded.current = true;
    if (missing.length > 0) {
      void bulkAddItems("repos", missing).catch((error) => {
        catalogSeeded.current = false;
        console.error("Could not seed GitHub repository catalog", error);
        toast.error("Could not load the GitHub repository catalog.");
      });
    }
  }, [repos, bulkAddItems]);

  useEffect(() => {
    if (catalogSynced.current || repos.length === 0) return;

    const catalogByUrl = new Map(GITHUB_REPO_CATALOG.map((r) => [r.url.toLowerCase(), r]));
    const catalogByName = new Map(GITHUB_REPO_CATALOG.map((r) => [r.name.toLowerCase(), r]));
    // Only technical catalog metadata is synchronized after seeding.
    // User-managed planning fields (priority, importance, done/pending, status,
    // progress) must remain editable and must never be overwritten on mount.
    const syncFields = ["visibility", "defaultBranch", "repoSizeKb"] as const;

    const updates = repos.flatMap((repo) => {
      const catalog =
        catalogByUrl.get(repo.url?.toLowerCase()) ?? catalogByName.get(repo.name.toLowerCase());
      if (!catalog) return [];

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

  useEffect(() => {
    if (canonicalAppsRepaired.current || repos.length === 0) return;
    const canonicalNames = new Set([
      "runmatch-ai-buddy-1282c193",
      "body-recomp-os-guru-7c1356da",
      "frenchie-care-compass",
      "mystic-blueprint-maker",
      "mice-solver-pro",
      "grow-stack-engine-945df4aa",
      "plantastic-haven-pro-8e23ae56",
      "neural-prompt-coach",
      "form-beauty-studio",
      "claw-skills-hub",
    ]);
    const catalogByName = new Map(GITHUB_REPO_CATALOG.map((item) => [item.name, item]));
    const repairs = repos.flatMap((local) => {
      if (!canonicalNames.has(local.name)) return [];
      const catalog = catalogByName.get(local.name);
      if (!catalog) return [];
      const wasLegacyMisclassified =
        local.priority === "low" || local.topics?.includes("canonical-review");
      if (!wasLegacyMisclassified) return [];
      return [{
        id: local.id,
        patch: {
          priority: catalog.priority,
          importance: catalog.importance,
          status: catalog.status,
          demoUrl: catalog.demoUrl,
          description: catalog.description,
          doneSummary: catalog.doneSummary,
          pendingSummary: catalog.pendingSummary,
          topics: catalog.topics,
        } as Partial<GitHubRepo>,
      }];
    });

    canonicalAppsRepaired.current = true;
    if (repairs.length > 0) {
      void Promise.all(repairs.map(({ id, patch }) => bulkPatch("repos", [id], patch))).catch(
        (error) => {
          canonicalAppsRepaired.current = false;
          console.error("Could not repair canonical app repo priorities", error);
        },
      );
    }
  }, [repos, bulkPatch]);

  const displayRepos = useMemo(() => {
    const localByUrl = new Map(repos.map((r) => [r.url?.toLowerCase(), r]));
    const localByName = new Map(repos.map((r) => [r.name.toLowerCase(), r]));

    return GITHUB_REPO_CATALOG.map((catalog, index) => {
      const local =
        localByUrl.get(catalog.url.toLowerCase()) ?? localByName.get(catalog.name.toLowerCase());
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
  };
  const uf = (field: keyof typeof form, val: any) => setForm((f) => ({ ...f, [field]: val }));

  const bulkDelete = useCallback(() => {
    if (bulk.selectedCount === 0) return;
    cd.confirm({
      title: `Delete ${bulk.selectedCount} Repo(s)`,
      description: `This will permanently remove ${bulk.selectedCount} repositories.`,
      onConfirm: () => {
        updateData({ repos: repos.filter((r) => !bulk.selectedIds.has(r.id)) });
        toast.success(`${bulk.selectedCount} repos deleted`);
        bulk.clearSelection();
      },
    });
  }, [bulk, repos, updateData, cd]);

  const bulkUpdateStatus = useCallback(
    (status: string) => {
      updateData({
        repos: repos.map((r) => (bulk.selectedIds.has(r.id) ? { ...r, status: status as any } : r)),
      });
      toast.success(`${bulk.selectedCount} repos updated`);
      bulk.clearSelection();
    },
    [bulk, repos, updateData],
  );

  return (
    <div className="space-y-4 sm:space-y-5">
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
              {GITHUB_REPO_CATALOG_COUNT}/{GITHUB_REPO_CATALOG_COUNT} live-account repositories reconciled · production relationships and URLs layered from the portfolio control workbook.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {[
              { label: "Repos", value: portfolioStats.total },
              { label: "Live apps", value: portfolioStats.live },
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
            {GITHUB_REPO_CATALOG_COUNT}/{GITHUB_REPO_CATALOG_COUNT} LIVE ACCOUNT REPOS
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
            onChange={(e) => setSearch(e.target.value)}
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

      <div className={compactView ? "grid grid-cols-1 xl:grid-cols-2 gap-2.5 sm:gap-3" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4"}>
        {filtered.map((repo, i) => (
          <div
            key={repo.id}
            onClick={bulk.bulkMode ? () => bulk.toggleSelect(repo.id) : undefined}
            className={`card-elevated group ${compactView ? "p-3.5 sm:p-4 space-y-2" : "p-4 sm:p-5 space-y-3"} ${bulk.bulkMode ? "cursor-pointer" : ""} ${bulk.isSelected(repo.id) ? "ring-1 ring-primary/30 border-primary/50" : ""}`}
          >
            <div className="flex items-start justify-between">
              {bulk.bulkMode && (
                <div className="mr-2">
                  {bulk.isSelected(repo.id) ? (
                    <CheckSquare size={16} className="text-primary" />
                  ) : (
                    <div className="w-4 h-4 rounded border border-muted-foreground/30" />
                  )}
                </div>
              )}
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-card-foreground hover:text-primary transition-colors truncate"
              >
                {repo.name}
              </a>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-1 border ${
                    repo.priority === "critical"
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : repo.priority === "high"
                        ? "bg-warning/10 text-warning border-warning/20"
                        : repo.priority === "low"
                          ? "bg-secondary text-muted-foreground border-border/30"
                          : "bg-primary/10 text-primary border-primary/20"
                  }`}
                  title={`Importance ${repo.importance ?? "unscored"}/100`}
                >
                  {repo.priority || "medium"}
                </span>
                <span
                  className={`badge-${repo.status === "active" ? "success" : repo.status === "stable" ? "info" : repo.status === "paused" ? "warning" : "muted"}`}
                >
                  {repo.status}
                </span>
              </div>
            </div>
            {(() => {
              const meta = REPO_PORTFOLIO_META[repo.name];
              const master = REPO_MASTER_LINKS[repo.name];
              const relationships = REPO_RELATIONSHIPS[repo.name] || [];
              const primaryRelationship = relationships[0];
              const state = meta?.portfolioState || master?.s || "REPO ONLY / NOT PROVEN LIVE";
              const stateTone = state.includes("DIRECT WEBSITE APP") || state.includes("STANDALONE LIVE APP")
                ? "border-success/20 bg-success/8 text-success"
                : state.includes("ORIGIN CANDIDATE")
                  ? "border-warning/20 bg-warning/8 text-warning"
                  : state.includes("WEBSITE CORE")
                    ? "border-primary/20 bg-primary/8 text-primary"
                    : "border-border/35 bg-secondary/55 text-muted-foreground";
              const actionLinks = Array.from(new Set([
                ...(master?.u || []),
                ...(master?.p || []),
                ...(master?.c || []),
                ...(master?.l || []),
                ...(meta?.productionUrls || []),
                ...(meta?.pagesUrls || []),
                ...(meta?.githubPagesUrls || []),
                ...(meta?.candidateUrls || []),
                ...relationships.flatMap((relationship) => [
                  relationship.aliasUrl,
                  relationship.canonicalUrl,
                  relationship.pagesUrl,
                  relationship.githubPagesUrl,
                  relationship.candidateUrl,
                ].filter(Boolean) as string[]),
              ]));
              return (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full border px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide ${stateTone}`}>
                      {state}
                    </span>
                    {meta?.portfolioPriority && meta.portfolioPriority !== "—" && (
                      <span className="rounded-full border border-border/35 bg-background/55 px-2 py-1 text-[9px] font-bold text-foreground">
                        {meta.portfolioPriority}
                      </span>
                    )}
                    {(meta?.category || master?.h) && (
                      <span className="max-w-full truncate rounded-full bg-secondary/55 px-2 py-1 text-[9px] font-semibold text-muted-foreground">
                        {meta?.category || master?.h}
                      </span>
                    )}
                    {master?.m && (
                      <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${master.m === "Verified" ? "bg-success/10 text-success" : master.m.includes("Strong") ? "bg-warning/10 text-warning" : "bg-secondary text-muted-foreground"}`}>
                        {master.m}
                      </span>
                    )}
                  </div>

                  {(meta?.parentWebsites?.length || master?.z?.length) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(meta?.parentWebsites?.length ? meta.parentWebsites : master?.z || []).map((website) => (
                        <span key={website} className="inline-flex items-center gap-1 rounded-lg bg-primary/6 px-2 py-1 text-[10px] font-semibold text-primary">
                          <Globe2 size={10} /> {website}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {primaryRelationship && (
                    <div className="rounded-2xl border border-border/35 bg-secondary/20 p-3">
                      <div className="flex items-start gap-2.5">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                          <ServerCog size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-foreground">{primaryRelationship.appName}</span>
                            <span className="rounded-md bg-background/70 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-muted-foreground">
                              {primaryRelationship.connectionType}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground">
                            {primaryRelationship.liveStatus}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9.5px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><ServerCog size={10} /> {primaryRelationship.hosting}</span>
                            <span className="inline-flex items-center gap-1"><GitBranch size={10} /> {primaryRelationship.branch}</span>
                            {relationships.length > 1 && <span>{relationships.length} production relationships</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!primaryRelationship && master && (master.h || master.z.length > 0) && (
                    <div className="rounded-2xl border border-border/35 bg-secondary/20 p-3">
                      <div className="flex items-start gap-2.5">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                          <ServerCog size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-foreground">{master.h || "Repository / deployment signal"}</div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[9.5px] text-muted-foreground">
                            {master.z.map((zone) => <span key={zone}>Zone: {zone}</span>)}
                            {master.m && <span>Evidence: {master.m}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {actionLinks.length > 0 && (
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {actionLinks.slice(0, compactView ? 4 : 8).map((url) => {
                        const label = url.includes("pages.dev")
                          ? "Pages.dev"
                          : url.includes("github.io")
                            ? "GitHub Pages"
                            : url.replace(/^https?:\/\//, "").replace(/\/$/, "");
                        return (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-w-0 items-center gap-2 rounded-xl border border-border/30 bg-background/50 px-2.5 py-2 text-[10.5px] font-semibold text-foreground transition hover:border-primary/25 hover:bg-primary/5"
                          >
                            <Link2 size={11} className="shrink-0 text-primary" />
                            <span className="min-w-0 flex-1 truncate">{label}</span>
                            <ArrowUpRight size={10} className="shrink-0 text-muted-foreground" />
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {(meta?.nextAction || primaryRelationship?.nextAction || master?.a) && (
                    <div className="rounded-xl border border-warning/15 bg-warning/5 px-3 py-2.5">
                      <div className="mb-1 flex items-center gap-1 text-[8.5px] font-extrabold uppercase tracking-[0.13em] text-warning">
                        <ShieldCheck size={10} /> Next action
                      </div>
                      <p className={compactView ? "line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground" : "text-[11px] leading-relaxed text-muted-foreground"}>
                        {primaryRelationship?.nextAction || meta?.nextAction || master?.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
            {!compactView && <p className="text-sm text-muted-foreground line-clamp-2">{repo.description}</p>}
            {(repo.doneSummary || repo.pendingSummary) && (
              <div className={`grid rounded-xl border border-border/30 bg-secondary/20 text-xs ${compactView ? "gap-1.5 p-2.5" : "gap-2 p-3"}`}>
                {repo.doneSummary && (
                  <div>
                    <div className="mb-1 font-bold uppercase tracking-wide text-success">Done</div>
                    <p className={compactView ? "line-clamp-1 leading-relaxed text-muted-foreground" : "line-clamp-2 leading-relaxed text-muted-foreground"}>{repo.doneSummary}</p>
                  </div>
                )}
                {repo.pendingSummary && (
                  <div>
                    <div className="mb-1 font-bold uppercase tracking-wide text-warning">Pending</div>
                    <p className={compactView ? "line-clamp-1 leading-relaxed text-muted-foreground" : "line-clamp-2 leading-relaxed text-muted-foreground"}>{repo.pendingSummary}</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${langColors[repo.language] || "bg-muted-foreground"}`}
                />
                {repo.language}
              </span>
              {repo.visibility && <span>{repo.visibility}</span>}
              {repo.defaultBranch && <span>branch: {repo.defaultBranch}</span>}
              <span className="flex items-center gap-1">
                <Star size={12} />
                {repo.stars}
              </span>
              <span className="flex items-center gap-1">
                <GitFork size={12} />
                {repo.forks}
              </span>
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{repo.progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${repo.progress}%` }}
                />
              </div>
            </div>
            {!compactView && repo.topics.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {repo.topics.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink size={12} /> Repo
              </a>
              {repo.demoUrl && (
                <a
                  href={repo.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  🌐 Demo
                </a>
              )}
              {repo.devPlatformUrl && (
                <a
                  href={repo.devPlatformUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Code2 size={12} /> Platform
                </a>
              )}
              {repo.deploymentUrl && (
                <a
                  href={repo.deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Rocket size={12} /> Deploy
                </a>
              )}
              {repo.dbType && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Database size={11} />{" "}
                  {DB_TYPES.find((d) => d.value === repo.dbType)?.label || repo.dbType}
                </span>
              )}
              {repo.dbDashboardUrl && (
                <a
                  href={repo.dbDashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  🔗 DB
                </a>
              )}
              {!bulk.bulkMode && (
                <button
                  type="button"
                  onClick={() => openEdit(repo)}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-border/40 bg-secondary/50 px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                >
                  <Edit2 size={13} /> Edit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-3">🐙</div>
          <p className="font-medium">No repositories found</p>
          <button
            onClick={() => {
              setSearch("");
              setPriorityFilter("all");
              setPortfolioFilter("all");
            }}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

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
