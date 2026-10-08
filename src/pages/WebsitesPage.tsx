import "@/components/websites/portfolio-aurora.css";
import {
  useWebsites,
  useAddItem,
  useUpdateItem,
  useDeleteItem,
  useBulkPatch,
  useBulkDeleteItems,
  useDuplicateItem,
  useTasks,
  useSEOSnapshots,
  useExportAllData,
} from "@/hooks/useTableData";
import ConfirmDialog, { useConfirmDialog } from "@/components/ConfirmDialog";
import { useCallback, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Copy,
  Globe,
  Edit2,
  Trash2,
  LayoutGrid,
  List,
  Layers,
  CheckSquare,
  Square,
  RefreshCw,
  Download,
  SortAsc,
  SortDesc,
  ExternalLink,
  Lock,
  LockKeyhole,
  Server,
  Zap,
  Rocket,
  Sparkles,
} from "lucide-react";
import FormModal, {
  FormField,
  FormInput,
  FormTextarea,
  FormSelect,
  FormTagsInput,
} from "@/components/FormModal";
import type { Task, Website } from "@/lib/db";
import { toast } from "sonner";
import { deduplicateTable } from "@/lib/dedup";
import { ensurePortfolioBootstrap } from "@/lib/portfolioBootstrap";
import { useNavigationStore } from "@/stores/navigationStore";
import {
  completeness,
  domainOf,
  ensureUrl,
  fleetSummary,
  latestEvidenceBySource,
  siteKind,
  summarizeTasks,
  tasksForSite,
} from "@/lib/portfolioInsights";
import PortfolioWebsiteCard from "@/components/websites/PortfolioWebsiteCard";
import PortfolioTaskQueue, {
  type PortfolioQueueItem,
} from "@/components/websites/PortfolioTaskQueue";
import {
  CATEGORY_CONFIG,
  PRIORITY_TONE,
  STATUS_CONFIG,
  WEBSITE_CATEGORY_OPTIONS,
  categoryVisual,
} from "@/components/websites/portfolioConfig";
import { Chip, Meter } from "@/components/websites/portfolioParts";
import { cn } from "@/lib/utils";

type SortField = "importance" | "name" | "status" | "category" | "dateAdded" | "lastUpdated";
type SortDirection = "asc" | "desc";
type TypeFilter = "all" | "wordpress" | "property";

const SORT_LABEL: Record<SortField, string> = {
  importance: "Importance",
  name: "Name",
  status: "Status",
  category: "Category",
  dateAdded: "Date added",
  lastUpdated: "Last updated",
};

const today = () => new Date().toISOString().split("T")[0];

const emptyWebsite: Omit<Website, "id"> = {
  name: "",
  url: "",
  wpAdminUrl: "",
  wpUsername: "",
  wpPassword: "",
  hostingProvider: "",
  hostingLoginUrl: "",
  hostingUsername: "",
  hostingPassword: "",
  category: "Personal",
  status: "active",
  notes: "",
  plugins: [],
  dateAdded: today(),
  lastUpdated: today(),
  tags: [],
  priority: "medium",
  importance: 50,
  niche: "",
  primaryGoal: "",
  revenueModel: "",
  appUrls: [],
  githubRepos: [],
};

const cleanList = (values: string[] | undefined) =>
  (values ?? []).map((value) => value.trim()).filter(Boolean);

const cleanUrl = (value: string | undefined) =>
  value && value.trim() ? ensureUrl(value.trim()) : "";

function compareSites(a: Website, b: Website, field: SortField): number {
  switch (field) {
    case "importance":
      return (a.importance ?? 0) - (b.importance ?? 0) || a.name.localeCompare(b.name);
    case "name":
      return a.name.localeCompare(b.name);
    case "status":
      return a.status.localeCompare(b.status);
    case "category":
      return a.category.localeCompare(b.category);
    case "dateAdded":
      return (a.dateAdded || "").localeCompare(b.dateAdded || "");
    case "lastUpdated":
      return (a.lastUpdated || "").localeCompare(b.lastUpdated || "");
  }
}

export default function WebsitesPage() {
  const websites = useWebsites();
  const tasks = useTasks();
  const snapshots = useSEOSnapshots();
  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const bulkPatch = useBulkPatch();
  const bulkDeleteItems = useBulkDeleteItems();
  const duplicateItem = useDuplicateItem();
  const exportAllData = useExportAllData();
  const setActiveSection = useNavigationStore((state) => state.setActiveSection);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState<TypeFilter>("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortField, setSortField] = useState<SortField>("importance");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Website, "id">>(emptyWebsite);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const cd = useConfirmDialog();

  // ─── Derived portfolio data ────────────────────────────────────

  const siteTasks = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const site of websites) map.set(site.id, tasksForSite(site, tasks));
    return map;
  }, [websites, tasks]);

  const evidence = useMemo(() => {
    const map = new Map<string, ReturnType<typeof latestEvidenceBySource>>();
    for (const site of websites) map.set(site.id, latestEvidenceBySource(site.id, snapshots));
    return map;
  }, [websites, snapshots]);

  const completenessById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof completeness>>();
    for (const site of websites) map.set(site.id, completeness(site));
    return map;
  }, [websites]);

  const summary = useMemo(
    () => fleetSummary(websites, tasks, snapshots),
    [websites, tasks, snapshots],
  );

  const categories = useMemo(
    () => Array.from(new Set(websites.map((site) => site.category))).sort(),
    [websites],
  );

  const statusCounts = useMemo(
    () => ({
      all: websites.length,
      active: websites.filter((site) => site.status === "active").length,
      maintenance: websites.filter((site) => site.status === "maintenance").length,
      down: websites.filter((site) => site.status === "down").length,
      archived: websites.filter((site) => site.status === "archived").length,
    }),
    [websites],
  );

  const typeCounts = useMemo(
    () => ({
      wordpress: websites.filter((site) => siteKind(site) === "wordpress").length,
      property: websites.filter((site) => siteKind(site) === "property").length,
    }),
    [websites],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return websites
      .filter((site) => filterStatus === "all" || site.status === filterStatus)
      .filter((site) => filterType === "all" || siteKind(site) === filterType)
      .filter((site) => filterCategory === "all" || site.category === filterCategory)
      .filter((site) => {
        if (!q) return true;
        return [
          site.name,
          site.url,
          site.category,
          site.hostingProvider,
          site.niche,
          site.primaryGoal,
          site.revenueModel,
          site.notes,
          ...(site.tags ?? []),
          ...(site.appUrls ?? []),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const cmp = compareSites(a, b, sortField);
        return sortDirection === "desc" ? -cmp : cmp;
      });
  }, [websites, filterStatus, filterType, filterCategory, search, sortField, sortDirection]);

  /** Open portfolio tasks: anything linked to a website, plus the seeded portfolio-wide tasks. */
  const queue = useMemo<PortfolioQueueItem[]>(() => {
    const siteNameByTaskId = new Map<string, string>();
    for (const site of websites) {
      if (site.status === "archived") continue;
      for (const task of siteTasks.get(site.id) ?? []) {
        if (!siteNameByTaskId.has(task.id)) siteNameByTaskId.set(task.id, site.name);
      }
    }
    return tasks
      .filter((task) => task.status !== "done")
      .filter(
        (task) =>
          siteNameByTaskId.has(task.id) ||
          (task.tags ?? []).some((tag) => tag.startsWith("portfolio-key:")),
      )
      .map((task) => ({ task, siteName: siteNameByTaskId.get(task.id) ?? null }));
  }, [websites, siteTasks, tasks]);

  // ─── Actions ───────────────────────────────────────────────────

  const openAdd = () => {
    setEditId(null);
    setForm({ ...emptyWebsite, dateAdded: today(), lastUpdated: today() });
    setModalOpen(true);
  };

  const openEdit = (site: Website) => {
    setEditId(site.id);
    const { id: _id, ...rest } = site;
    setForm({ ...emptyWebsite, ...rest });
    setModalOpen(true);
  };

  const saveForm = () => {
    if (!form.name.trim()) {
      toast.error("Website name is required.");
      return;
    }
    if (!form.url.trim()) {
      toast.error("Website URL is required.");
      return;
    }
    const payload = {
      ...form,
      name: form.name.trim(),
      url: cleanUrl(form.url),
      wpAdminUrl: cleanUrl(form.wpAdminUrl),
      hostingLoginUrl: cleanUrl(form.hostingLoginUrl),
      appUrls: cleanList(form.appUrls).map(ensureUrl),
      githubRepos: cleanList(form.githubRepos),
      plugins: cleanList(form.plugins),
      tags: cleanList(form.tags).map((tag) => tag.toLowerCase()),
      importance:
        typeof form.importance === "number"
          ? Math.max(0, Math.min(100, form.importance))
          : undefined,
      lastUpdated: today(),
    };
    if (editId) {
      void updateItem<Website>("websites", editId, payload);
      toast.success("Website updated");
    } else {
      void addItem("websites", { ...payload, dateAdded: today() } as any);
      toast.success("Website added");
    }
    setModalOpen(false);
  };

  const deleteWebsite = (id: string) => {
    const site = websites.find((w) => w.id === id);
    cd.confirm({
      title: "Delete website",
      description: `${site?.name ?? "This website"} and its record will be removed. Linked tasks stay, unlinked.`,
      onConfirm: () => {
        void deleteItem("websites", id);
        toast.success("Website deleted");
      },
    });
  };

  const duplicateWebsite = async (id: string) => {
    const newId = await duplicateItem("websites", id);
    if (newId) toast.success("Website duplicated");
  };

  const copyText = useCallback((text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((w) => w.id)));
  }, [filtered, selectedIds.size]);

  const bulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    cd.confirm({
      title: `Delete ${selectedIds.size} website${selectedIds.size === 1 ? "" : "s"}`,
      description: `This permanently removes ${selectedIds.size} website record${selectedIds.size === 1 ? "" : "s"}.`,
      onConfirm: () => {
        void bulkDeleteItems("websites", [...selectedIds]);
        toast.success(`${selectedIds.size} website${selectedIds.size === 1 ? "" : "s"} deleted`);
        setSelectedIds(new Set());
        setBulkMode(false);
      },
    });
  }, [selectedIds, bulkDeleteItems, cd]);

  const bulkUpdate = useCallback(
    (changes: Partial<Website>, label: string) => {
      if (selectedIds.size === 0) return;
      void bulkPatch("websites", [...selectedIds], { ...changes, lastUpdated: today() });
      toast.success(`${selectedIds.size} website${selectedIds.size === 1 ? "" : "s"} ${label}`);
      setSelectedIds(new Set());
    },
    [selectedIds, bulkPatch],
  );

  const restorePortfolio = async () => {
    setRestoring(true);
    try {
      const result = await ensurePortfolioBootstrap();
      const changed = result.websitesAdded + result.websitesUpdated + result.tasksAdded;
      if (changed) {
        toast.success("Portfolio restored", {
          description: `${result.websitesAdded} website${result.websitesAdded === 1 ? "" : "s"} added · ${result.websitesUpdated} updated · ${result.tasksAdded} task${result.tasksAdded === 1 ? "" : "s"} added`,
        });
      } else {
        toast.success(
          `All ${result.websitesInPortfolio} portfolio websites are already in My Websites`,
        );
      }
    } catch {
      toast.error("Could not restore the portfolio. Check browser storage and try again.");
    } finally {
      setRestoring(false);
    }
  };

  const backup = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([data], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `mission-control-backup-${today()}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Backup downloaded");
    } catch {
      toast.error("Backup failed. Please try again.");
    }
  };

  const startTask = (task: Task) => {
    void updateItem<Task>("tasks", task.id, { status: "in-progress" });
    toast.success("Started", { description: task.title });
  };

  const completeTask = (task: Task) => {
    void updateItem<Task>("tasks", task.id, {
      status: "done",
      completedAt: new Date().toISOString(),
    });
    toast.success("Done", { description: task.title });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field)
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDirection(
        field === "name" || field === "status" || field === "category" ? "asc" : "desc",
      );
    }
  };

  const uf = <K extends keyof Omit<Website, "id">>(field: K, value: Omit<Website, "id">[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  // ─── Card + row renderers ──────────────────────────────────────

  const renderCard = (site: Website) => {
    const tasksFor = siteTasks.get(site.id) ?? [];
    return (
      <PortfolioWebsiteCard
        key={site.id}
        site={site}
        tasks={tasksFor}
        evidence={evidence.get(site.id) ?? []}
        completeness={completenessById.get(site.id) ?? completeness(site)}
        selected={selectedIds.has(site.id)}
        bulkMode={bulkMode}
        onToggleSelect={() => toggleSelect(site.id)}
        onEdit={() => openEdit(site)}
        onDuplicate={() => void duplicateWebsite(site.id)}
        onDelete={() => deleteWebsite(site.id)}
        onCopy={copyText}
        onConnectEvidence={() => setActiveSection("seo")}
      />
    );
  };

  const renderRow = (site: Website) => {
    const visual = categoryVisual(site.category);
    const tasksFor = summarizeTasks(siteTasks.get(site.id) ?? []);
    const status = STATUS_CONFIG[site.status] ?? STATUS_CONFIG.active;
    const done = completenessById.get(site.id)?.percent ?? 0;
    const selected = selectedIds.has(site.id);
    const kind = siteKind(site);
    return (
      <div
        key={site.id}
        className={cn("pf-row", selected && "pf-row--selected", bulkMode && "cursor-pointer")}
        onClick={bulkMode ? () => toggleSelect(site.id) : undefined}
      >
        <div className="flex items-center gap-3">
          {bulkMode &&
            (selected ? (
              <CheckSquare size={18} className="text-[hsl(var(--pf-accent))]" aria-hidden />
            ) : (
              <Square size={18} className="text-[hsl(var(--pf-muted))]" aria-hidden />
            ))}
          <div
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-sm font-extrabold text-white shadow-sm",
              visual.gradient,
            )}
            aria-hidden
          >
            {site.name.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="pf-row-main">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pf-name text-[14px]">{site.name}</span>
            <Chip tone={status.tone}>{status.label}</Chip>
            {site.priority && (
              <Chip tone={PRIORITY_TONE[site.priority] ?? "muted"}>{site.priority}</Chip>
            )}
            <Chip tone={kind === "wordpress" ? "sky" : "violet"}>
              {kind === "wordpress" ? "WordPress" : "Property"}
            </Chip>
          </div>
          {site.primaryGoal && (
            <div
              className="line-clamp-1 text-[12px] font-semibold"
              style={{ color: "hsl(var(--pf-ink) / 0.85)" }}
            >
              {site.primaryGoal}
            </div>
          )}
          <div className="pf-row-meta">
            <a
              href={ensureUrl(site.url)}
              target="_blank"
              rel="noreferrer"
              className="pf-domain m-0 max-w-[260px]"
              onClick={(event) => event.stopPropagation()}
            >
              {domainOf(site.url)}
            </a>
            <span>
              {visual.emoji} {site.category}
            </span>
            {site.hostingProvider && (
              <span className="inline-flex items-center gap-1">
                <Server size={10} aria-hidden /> {site.hostingProvider}
              </span>
            )}
            <span>
              {tasksFor.open} open task{tasksFor.open === 1 ? "" : "s"}
            </span>
            <span>
              {(site.appUrls ?? []).length} app{(site.appUrls ?? []).length === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-2">
              Profile {done}%
              <span className="w-16">
                <Meter percent={done} />
              </span>
            </span>
          </div>
        </div>
        <div className="pf-row-actions" onClick={(event) => event.stopPropagation()}>
          <a
            href={ensureUrl(site.url)}
            target="_blank"
            rel="noreferrer"
            className="pf-icon-btn"
            title="Open site"
            aria-label={`Open ${site.name}`}
          >
            <ExternalLink size={14} aria-hidden />
          </a>
          {site.wpAdminUrl && (
            <a
              href={ensureUrl(site.wpAdminUrl)}
              target="_blank"
              rel="noreferrer"
              className="pf-icon-btn"
              title="WP admin"
              aria-label={`WP admin for ${site.name}`}
            >
              <LockKeyhole size={14} aria-hidden />
            </a>
          )}
          <button
            type="button"
            className="pf-icon-btn"
            onClick={() => duplicateWebsite(site.id)}
            title="Duplicate"
            aria-label={`Duplicate ${site.name}`}
          >
            <Copy size={14} aria-hidden />
          </button>
          <button
            type="button"
            className="pf-icon-btn"
            onClick={() => openEdit(site)}
            title="Edit"
            aria-label={`Edit ${site.name}`}
          >
            <Edit2 size={14} aria-hidden />
          </button>
          <button
            type="button"
            className="pf-icon-btn pf-icon-btn--danger"
            onClick={() => deleteWebsite(site.id)}
            title="Delete"
            aria-label={`Delete ${site.name}`}
          >
            <Trash2 size={14} aria-hidden />
          </button>
        </div>
      </div>
    );
  };

  const kpis = [
    { label: "Websites", value: summary.total, tone: "" },
    { label: "WordPress", value: summary.wordpress, tone: "" },
    { label: "Connected apps", value: summary.apps, tone: "pf-kpi--violet" },
    { label: "Open tasks", value: summary.openTasks, tone: "pf-kpi--accent" },
    {
      label: "Blocked",
      value: summary.blockedTasks,
      tone: summary.blockedTasks ? "pf-kpi--rose" : "",
    },
    {
      label: "Need attention",
      value: summary.needsAttention,
      tone: summary.needsAttention ? "pf-kpi--amber" : "",
    },
    { label: "Search data", value: `${summary.withEvidence}/${summary.total}`, tone: "" },
    { label: "Profile complete", value: `${summary.avgCompleteness}%`, tone: "" },
  ];

  // ─── Main render ───────────────────────────────────────────────

  return (
    <div className="pf-root space-y-6">
      {/* Hero */}
      <section className="pf-hero" aria-labelledby="pf-title">
        <div className="pf-orb pf-orb--a" aria-hidden />
        <div className="pf-orb pf-orb--b" aria-hidden />
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 max-w-2xl">
            <div className="pf-eyebrow">Portfolio command center</div>
            <h1 id="pf-title" className="pf-title">
              My Websites
            </h1>
            <p className="pf-subtitle">
              Manage all your websites, credentials, and hosting from one place. Each card shows the
              goal, the revenue path, the apps, the open work and the next move.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="pf-btn"
              onClick={restorePortfolio}
              disabled={restoring}
            >
              <RefreshCw size={13} className={cn(restoring && "animate-spin")} aria-hidden />{" "}
              Restore portfolio
            </button>
            <button type="button" className="pf-btn" onClick={backup}>
              <Download size={13} aria-hidden /> Backup
            </button>
            <button
              type="button"
              className="pf-btn"
              onClick={async () => {
                const n = await deduplicateTable("websites");
                toast.success(
                  n > 0 ? `Merged ${n} duplicate${n === 1 ? "" : "s"}` : "No duplicates found",
                );
              }}
            >
              <Layers size={13} aria-hidden /> Merge duplicates
            </button>
            <button
              type="button"
              className={cn("pf-btn", bulkMode && "pf-btn--danger")}
              onClick={() => {
                setBulkMode(!bulkMode);
                setSelectedIds(new Set());
              }}
              aria-pressed={bulkMode}
            >
              <CheckSquare size={13} aria-hidden /> {bulkMode ? "Cancel bulk" : "Bulk select"}
            </button>
            <button type="button" className="pf-btn pf-btn--primary" onClick={openAdd}>
              <Plus size={15} aria-hidden /> Add website
            </button>
          </div>
        </div>

        <div className="pf-kpis" role="list" aria-label="Portfolio totals">
          {kpis.map((kpi) => (
            <div key={kpi.label} role="listitem" className={cn("pf-kpi", kpi.tone)}>
              <div className="pf-kpi-value">{kpi.value}</div>
              <div className="pf-kpi-label">{kpi.label}</div>
            </div>
          ))}
        </div>
        <p className="pf-note mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Sparkles size={11} aria-hidden /> Every change saves on this device as you make it. Dot
          colors on each card show cloud save status. Back up any time.
        </p>
      </section>

      {/* Bulk action bar */}
      {bulkMode && (
        <div className="pf-panel flex flex-wrap items-center gap-2 !p-3">
          <button type="button" className="pf-btn" onClick={selectAll}>
            {selectedIds.size === filtered.length && filtered.length > 0 ? (
              <CheckSquare size={13} aria-hidden />
            ) : (
              <Square size={13} aria-hidden />
            )}
            {selectedIds.size === filtered.length && filtered.length > 0
              ? "Deselect all"
              : "Select all"}
          </button>
          <span className="pf-note font-bold">{selectedIds.size} selected</span>
          {selectedIds.size > 0 && (
            <>
              <select
                aria-label="Set status for selected websites"
                className="pf-select"
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    bulkUpdate(
                      { status: e.target.value as Website["status"] },
                      `set to ${e.target.value}`,
                    );
                }}
              >
                <option value="">Set status…</option>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="down">Down</option>
                <option value="archived">Archived</option>
              </select>
              <select
                aria-label="Set category for selected websites"
                className="pf-select"
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    bulkUpdate({ category: e.target.value }, `moved to ${e.target.value}`);
                }}
              >
                <option value="">Set category…</option>
                {WEBSITE_CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_CONFIG[category]?.emoji || "🌐"} {category}
                  </option>
                ))}
              </select>
              <select
                aria-label="Set priority for selected websites"
                className="pf-select"
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    bulkUpdate(
                      { priority: e.target.value as Website["priority"] },
                      `set to ${e.target.value} priority`,
                    );
                }}
              >
                <option value="">Set priority…</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button type="button" className="pf-btn pf-btn--danger ml-auto" onClick={bulkDelete}>
                <Trash2 size={13} aria-hidden /> Delete ({selectedIds.size})
              </button>
            </>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="pf-toolbar flex flex-wrap items-center gap-2">
        <label className="pf-search">
          <Search size={15} aria-hidden />
          <span className="sr-only">Search websites</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, goal, niche, app, tag…"
          />
        </label>

        <div className="pf-seg" role="group" aria-label="Filter by status">
          {(["all", "active", "maintenance", "down", "archived"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={filterStatus === s}
              onClick={() => setFilterStatus(s)}
            >
              {s === "all" ? "All" : STATUS_CONFIG[s].label}
              <span className="pf-seg-count">{statusCounts[s]}</span>
            </button>
          ))}
        </div>

        <div className="pf-seg" role="group" aria-label="Filter by type">
          {(["all", "wordpress", "property"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={filterType === t}
              onClick={() => setFilterType(t)}
            >
              {t === "all" ? "All types" : t === "wordpress" ? "WordPress" : "Web property"}
              <span className="pf-seg-count">{t === "all" ? websites.length : typeCounts[t]}</span>
            </button>
          ))}
        </div>

        <select
          aria-label="Filter by category"
          className="pf-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_CONFIG[category]?.emoji || "🌐"} {category}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <select
            aria-label="Sort by"
            className="pf-select"
            value={sortField}
            onChange={(e) => toggleSort(e.target.value as SortField)}
          >
            {(Object.keys(SORT_LABEL) as SortField[]).map((field) => (
              <option key={field} value={field}>
                {SORT_LABEL[field]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="pf-icon-btn"
            onClick={() => setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"))}
            aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
            title="Flip sort direction"
          >
            {sortDirection === "desc" ? (
              <SortDesc size={15} aria-hidden />
            ) : (
              <SortAsc size={15} aria-hidden />
            )}
          </button>
          <div className="pf-seg" role="group" aria-label="View">
            <button
              type="button"
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
              aria-label="Card view"
            >
              <LayoutGrid size={14} aria-hidden />
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <List size={14} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <div className="pf-note font-semibold">
        Showing {filtered.length} of {websites.length} websites
        {search.trim() && (
          <span>
            {" "}
            matching{" "}
            <span style={{ color: "hsl(var(--pf-accent))" }}>&ldquo;{search.trim()}&rdquo;</span>
          </span>
        )}
      </div>

      {/* Main content */}
      {filtered.length > 0 ? (
        viewMode === "grid" ? (
          <div className="pf-grid">{filtered.map((site) => renderCard(site))}</div>
        ) : (
          <div className="pf-list">{filtered.map((site) => renderRow(site))}</div>
        )
      ) : (
        <div className="pf-empty">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[hsl(var(--pf-surface-2))]">
            <Globe size={30} className="text-[hsl(var(--pf-muted))]" aria-hidden />
          </div>
          <h3>{websites.length === 0 ? "No websites yet" : "No websites match these filters"}</h3>
          <p className="pf-note max-w-sm">
            {websites.length === 0
              ? "Restore your portfolio to bring back every site you manage, or add one yourself."
              : "Try a different search, status or type."}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {websites.length === 0 && (
              <button type="button" className="pf-btn" onClick={restorePortfolio}>
                <RefreshCw size={13} aria-hidden /> Restore portfolio
              </button>
            )}
            <button type="button" className="pf-btn pf-btn--primary" onClick={openAdd}>
              <Plus size={14} aria-hidden /> Add website
            </button>
          </div>
        </div>
      )}

      {/* Portfolio task queue */}
      <PortfolioTaskQueue items={queue} onStart={startTask} onDone={completeTask} />

      {/* Quick glance at revenue paths */}
      {summary.total > 0 && (
        <div className="pf-note flex flex-wrap items-center gap-2">
          <Rocket size={12} aria-hidden /> Revenue paths in your portfolio:
          {Array.from(
            new Set(
              websites
                .filter((s) => s.status !== "archived" && s.revenueModel)
                .map((s) => s.revenueModel),
            ),
          ).map((model) => (
            <Chip key={model} tone="accent">
              <Zap size={10} aria-hidden /> {model}
            </Chip>
          ))}
        </div>
      )}

      {/* ─── Add / edit ─────────────────────────────────────────── */}
      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit website" : "Add website"}
        onSubmit={saveForm}
        size="lg"
      >
        <div className="space-y-6">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Globe size={13} className="text-primary" aria-hidden /> Basics
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Site name *">
                <FormInput
                  value={form.name}
                  onChange={(v) => uf("name", v)}
                  placeholder="GearUpToFit"
                />
              </FormField>
              <FormField label="URL *">
                <FormInput
                  value={form.url}
                  onChange={(v) => uf("url", v)}
                  placeholder="https://example.com"
                />
              </FormField>
              <FormField label="Category">
                <FormSelect
                  value={form.category}
                  onChange={(v) => uf("category", v)}
                  options={WEBSITE_CATEGORY_OPTIONS.map((category) => ({
                    value: category,
                    label: `${CATEGORY_CONFIG[category]?.emoji || "🌐"} ${category}`,
                  }))}
                />
              </FormField>
              <FormField label="Status">
                <FormSelect
                  value={form.status}
                  onChange={(v) => uf("status", v as Website["status"])}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "maintenance", label: "Maintenance" },
                    { value: "down", label: "Down" },
                    { value: "archived", label: "Archived" },
                  ]}
                />
              </FormField>
              <FormField label="Priority">
                <FormSelect
                  value={form.priority ?? "medium"}
                  onChange={(v) => uf("priority", v as Website["priority"])}
                  options={[
                    { value: "critical", label: "Critical" },
                    { value: "high", label: "High" },
                    { value: "medium", label: "Medium" },
                    { value: "low", label: "Low" },
                  ]}
                />
              </FormField>
              <FormField label="Importance (0–100)">
                <FormInput
                  type="number"
                  value={form.importance === undefined ? "" : String(form.importance)}
                  onChange={(v) => uf("importance", v === "" ? undefined : Number(v))}
                  placeholder="50"
                />
              </FormField>
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Sparkles size={13} className="text-[hsl(var(--pf-accent))]" aria-hidden /> Strategy
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Niche">
                <FormInput
                  value={form.niche ?? ""}
                  onChange={(v) => uf("niche", v)}
                  placeholder="Running shoes, fitness, supplements"
                />
              </FormField>
              <FormField label="Revenue model">
                <FormInput
                  value={form.revenueModel ?? ""}
                  onChange={(v) => uf("revenueModel", v)}
                  placeholder="Affiliate commissions + app funnel"
                />
              </FormField>
            </div>
            <div className="mt-4">
              <FormField label="Main goal">
                <FormTextarea
                  value={form.primaryGoal ?? ""}
                  onChange={(v) => uf("primaryGoal", v)}
                  placeholder="The one outcome that matters most for this site"
                />
              </FormField>
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Lock size={13} className="text-sky-500" aria-hidden /> WordPress access
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField label="WP admin URL">
                <FormInput
                  value={form.wpAdminUrl}
                  onChange={(v) => uf("wpAdminUrl", v)}
                  placeholder="https://site.com/wp-admin/"
                />
              </FormField>
              <FormField label="WP username">
                <FormInput
                  value={form.wpUsername}
                  onChange={(v) => uf("wpUsername", v)}
                  placeholder="admin"
                />
              </FormField>
              <FormField label="WP password">
                <FormInput
                  type="password"
                  value={form.wpPassword}
                  onChange={(v) => uf("wpPassword", v)}
                  placeholder="••••••"
                />
              </FormField>
            </div>
            <p className="pf-note mt-2">
              Credentials stay in this browser. They are never written to the shared portfolio.
            </p>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Server size={13} className="text-violet-500" aria-hidden /> Hosting
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Hosting provider">
                <FormInput
                  value={form.hostingProvider}
                  onChange={(v) => uf("hostingProvider", v)}
                  placeholder="Cloudflare, SiteGround, Cloudways…"
                />
              </FormField>
              <FormField label="Hosting login URL">
                <FormInput
                  value={form.hostingLoginUrl}
                  onChange={(v) => uf("hostingLoginUrl", v)}
                  placeholder="https://dash.cloudflare.com/"
                />
              </FormField>
              <FormField label="Hosting username">
                <FormInput
                  value={form.hostingUsername}
                  onChange={(v) => uf("hostingUsername", v)}
                  placeholder="Username"
                />
              </FormField>
              <FormField label="Hosting password">
                <FormInput
                  type="password"
                  value={form.hostingPassword}
                  onChange={(v) => uf("hostingPassword", v)}
                  placeholder="••••••"
                />
              </FormField>
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Zap size={13} className="text-amber-500" aria-hidden /> Apps, repos & details
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Connected app URLs">
                <FormTagsInput
                  value={form.appUrls ?? []}
                  onChange={(v) => uf("appUrls", v)}
                  placeholder="Paste a URL and press Enter"
                />
              </FormField>
              <FormField label="GitHub repos">
                <FormTagsInput
                  value={form.githubRepos ?? []}
                  onChange={(v) => uf("githubRepos", v)}
                  placeholder="https://github.com/owner/repo"
                />
              </FormField>
              <FormField label="Plugins">
                <FormTagsInput
                  value={form.plugins}
                  onChange={(v) => uf("plugins", v)}
                  placeholder="Plugin name and Enter"
                />
              </FormField>
              <FormField label="Tags (used to link tasks)">
                <FormTagsInput
                  value={form.tags ?? []}
                  onChange={(v) => uf("tags", v)}
                  placeholder="gearuptofit, seo…"
                />
              </FormField>
            </div>
            <div className="mt-4">
              <FormField label="Notes">
                <FormTextarea
                  value={form.notes}
                  onChange={(v) => uf("notes", v)}
                  placeholder="Quick notes about this site…"
                />
              </FormField>
            </div>
          </section>
        </div>
      </FormModal>

      <ConfirmDialog {...cd.dialogProps} />
    </div>
  );
}
