import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Edit2,
  ExternalLink,
  Github,
  Globe,
  Link2,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Rocket,
  Route,
  BarChart3,
  BadgeDollarSign,
  Layers3,
} from "lucide-react";
import { APP_FUNNEL_CATALOG } from "@/lib/appPortfolio";
import { useAddItem, useBuildProjects, useUpdateItem } from "@/hooks/useTableData";
import type { BuildProject } from "@/lib/db";
import FormModal, {
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  FormTagsInput,
} from "@/components/FormModal";
import { toast } from "sonner";

const priorityRank: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export default function AppsFunnelsPage() {
  const buildProjects = useBuildProjects();
  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const seeded = useRef(false);

  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [editRepo, setEditRepo] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Omit<BuildProject, "id">>(APP_FUNNEL_CATALOG[0]);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const existing = new Set(
      buildProjects.flatMap((item) =>
        [item.githubRepo?.toLowerCase(), item.name?.toLowerCase()].filter(Boolean) as string[],
      ),
    );
    const missing = APP_FUNNEL_CATALOG.filter(
      (item) =>
        !existing.has(item.githubRepo.toLowerCase()) &&
        !existing.has(item.name.toLowerCase()),
    );
    if (missing.length > 0) {
      void Promise.all(missing.map((item) => addItem<BuildProject>("buildProjects", item))).catch(
        (error) => {
          seeded.current = false;
          console.error("Could not seed app portfolio", error);
          toast.error("Could not initialize Apps & Funnels.");
        },
      );
    }
  }, [buildProjects, addItem]);

  const portfolio = useMemo(() => {
    const localByRepo = new Map(
      buildProjects
        .filter((item) => item.githubRepo)
        .map((item) => [item.githubRepo.toLowerCase(), item]),
    );
    const localByName = new Map(buildProjects.map((item) => [item.name.toLowerCase(), item]));

    return APP_FUNNEL_CATALOG.map((catalog) => {
      const local =
        localByRepo.get(catalog.githubRepo.toLowerCase()) ??
        localByName.get(catalog.name.toLowerCase());
      return {
        ...(catalog as BuildProject),
        ...(local ?? {}),
        id: local?.id ?? `catalog-${catalog.name}`,
        // Canonical relationship fields always come from the catalog so stale
        // persisted records can never resurrect retired domains or deployments.
        githubRepo: catalog.githubRepo,
        projectUrl: catalog.projectUrl,
        deployedUrl: catalog.deployedUrl,
        parentWebsite: catalog.parentWebsite,
        landingPage: catalog.landingPage,
        alternateUrls: catalog.alternateUrls,
        productName: catalog.productName,
      } as BuildProject;
    });
  }, [buildProjects]);

  const apps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...portfolio]
      .filter((app) => priority === "all" || app.priority === priority)
      .filter((app) => {
        if (!q) return true;
        return [
          app.name,
          app.productName,
          app.parentWebsite,
          app.landingPage,
          app.githubRepo,
          app.deployedUrl,
          app.description,
          app.nextSteps,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .sort(
        (a, b) =>
          (priorityRank[a.priority || "medium"] ?? 2) -
            (priorityRank[b.priority || "medium"] ?? 2) ||
          (b.importance || 0) - (a.importance || 0) ||
          a.name.localeCompare(b.name),
      );
  }, [portfolio, priority, search]);

  const stats = useMemo(
    () => ({
      total: portfolio.length,
      deployed: portfolio.filter((app) => app.status === "deployed").length,
      critical: portfolio.filter((app) => app.priority === "critical").length,
      growthApps: portfolio.filter((app) => app.portfolioGroup === "growth-app").length,
    }),
    [portfolio],
  );

  const openEdit = (app: BuildProject) => {
    const persisted = buildProjects.find(
      (item) =>
        item.githubRepo?.toLowerCase() === app.githubRepo.toLowerCase() ||
        item.name.toLowerCase() === app.name.toLowerCase(),
    );
    const { id, ...rest } = app;
    setEditId(persisted?.id ?? null);
    setEditRepo(app.githubRepo);
    setForm(rest);
    setModalOpen(true);
  };

  const saveForm = async () => {
    const canonical = APP_FUNNEL_CATALOG.find((item) => item.githubRepo === editRepo);
    if (!canonical) return;

    const payload: Omit<BuildProject, "id"> = {
      ...form,
      githubRepo: canonical.githubRepo,
      projectUrl: canonical.projectUrl,
      deployedUrl: canonical.deployedUrl,
      parentWebsite: canonical.parentWebsite,
      landingPage: canonical.landingPage,
      alternateUrls: canonical.alternateUrls,
      productName: canonical.productName,
      name: form.name.trim() || canonical.name,
      lastWorkedOn: new Date().toISOString().split("T")[0],
    };

    if (editId) {
      await updateItem<BuildProject>("buildProjects", editId, payload);
    } else {
      await addItem<BuildProject>("buildProjects", payload);
    }
    setModalOpen(false);
    toast.success("App portfolio updated");
  };

  const uf = (field: keyof typeof form, value: unknown) =>
    setForm((current) => ({ ...current, [field]: value }));

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            <Sparkles size={11} /> Revenue assets
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Apps & Funnels
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Production apps mapped to their GitHub repo, live deployment, parent website, and funnel entry point.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Apps", value: stats.total },
            { label: "Deployed", value: stats.deployed },
            { label: "Critical", value: stats.critical },
            { label: "Growth", value: stats.growthApps },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border/40 bg-card/70 px-3 py-2.5 text-center shadow-sm backdrop-blur">
              <div className="text-lg font-extrabold tabular-nums text-foreground">{stat.value}</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full items-center gap-2 rounded-xl bg-secondary px-3 py-2 lg:max-w-md">
          <Search size={14} className="shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search apps, repos, sites, funnels..."
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(["all", "critical", "high", "medium", "low"] as const).map((item) => {
            const count =
              item === "all"
                ? portfolio.length
                : portfolio.filter((app) => app.priority === item).length;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setPriority(item)}
                className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  priority === item
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/30 bg-card/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {item} <span className="ml-1 opacity-65">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {apps.map((app, index) => {
          const live = app.status === "deployed" && Boolean(app.deployedUrl);
          const importance = Math.max(0, Math.min(100, app.importance || 0));
          const host = (url?: string) => {
            if (!url) return "";
            try {
              return new URL(url).host;
            } catch {
              return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
            }
          };
          return (
            <article
              key={app.githubRepo}
              className="revenue-card group"
              data-priority={app.priority || "medium"}
              style={{ "--revenue-card-index": index } as React.CSSProperties}
            >
              <div className="revenue-card-glow" aria-hidden />

              <div className="revenue-card-head">
                <div className="revenue-card-icon">
                  <Rocket size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="revenue-card-kicker">
                      {app.portfolioGroup === "growth-app" ? "Revenue app" : "Product tool"}
                    </span>
                    <span className={`revenue-status ${live ? "is-live" : "is-testing"}`}>
                      <span />
                      {live ? "Live" : app.status}
                    </span>
                  </div>
                  <h2 className="revenue-card-title">{app.productName || app.name}</h2>
                  <p className="revenue-card-description">{app.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => openEdit(app)}
                  className="revenue-edit"
                  title="Edit planning details"
                >
                  <Edit2 size={14} />
                </button>
              </div>

              <div className="revenue-score-row">
                <div className="revenue-score">
                  <div className="revenue-score-ring" style={{ "--score": importance } as React.CSSProperties}>
                    <strong>{importance}</strong>
                  </div>
                  <div>
                    <span>Importance</span>
                    <strong>{app.priority || "medium"} priority</strong>
                  </div>
                </div>
                <div className="revenue-health">
                  <BarChart3 size={14} />
                  <span>{live ? "Production asset" : "Needs production validation"}</span>
                </div>
              </div>

              <div className="revenue-link-stack">
                <a href={app.githubRepo} target="_blank" rel="noopener noreferrer" className="revenue-link revenue-link-repo">
                  <span className="revenue-link-icon"><Github size={15} /></span>
                  <span className="revenue-link-copy">
                    <small>GitHub repository</small>
                    <strong>{app.githubRepo.replace("https://github.com/", "")}</strong>
                  </span>
                  <ArrowUpRight size={13} />
                </a>

                {app.deployedUrl ? (
                  <a href={app.deployedUrl} target="_blank" rel="noopener noreferrer" className="revenue-link revenue-link-live">
                    <span className="revenue-link-icon"><Globe size={15} /></span>
                    <span className="revenue-link-copy">
                      <small>Production app</small>
                      <strong>{host(app.deployedUrl)}</strong>
                    </span>
                    <ExternalLink size={13} />
                  </a>
                ) : (
                  <div className="revenue-link revenue-link-muted">
                    <span className="revenue-link-icon"><Globe size={15} /></span>
                    <span className="revenue-link-copy">
                      <small>Production app</small>
                      <strong>URL pending</strong>
                    </span>
                  </div>
                )}

                {app.landingPage && (
                  <a href={app.landingPage} target="_blank" rel="noopener noreferrer" className="revenue-link">
                    <span className="revenue-link-icon"><Route size={15} /></span>
                    <span className="revenue-link-copy">
                      <small>Funnel entry</small>
                      <strong>{host(app.landingPage)}{new URL(app.landingPage).pathname !== "/" ? new URL(app.landingPage).pathname : ""}</strong>
                    </span>
                    <ArrowUpRight size={13} />
                  </a>
                )}

                {app.parentWebsite && app.parentWebsite !== app.landingPage && (
                  <a href={app.parentWebsite} target="_blank" rel="noopener noreferrer" className="revenue-link">
                    <span className="revenue-link-icon"><ShieldCheck size={15} /></span>
                    <span className="revenue-link-copy">
                      <small>Parent website</small>
                      <strong>{host(app.parentWebsite)}</strong>
                    </span>
                    <ArrowUpRight size={13} />
                  </a>
                )}
              </div>

              {app.alternateUrls && app.alternateUrls.length > 0 && (
                <div className="revenue-alt-wrap">
                  <div className="revenue-alt-label"><Layers3 size={12} /> Alternate deployments</div>
                  <div className="revenue-alt-list">
                    {app.alternateUrls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                        {host(url)}
                        <ArrowUpRight size={10} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="revenue-next">
                <div className="revenue-next-label">
                  <BadgeDollarSign size={13} />
                  Highest-value revenue action
                </div>
                <p>{app.nextSteps}</p>
              </div>
            </article>
          );
        })}
      </div>

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit App & Funnel"
        onSubmit={saveForm}
      >
        <FormField label="Product name">
          <FormInput value={form.productName || ""} onChange={(value) => uf("productName", value)} />
        </FormField>
        <FormField label="Description">
          <FormTextarea value={form.description} onChange={(value) => uf("description", value)} rows={2} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Priority">
            <FormSelect
              value={form.priority || "medium"}
              onChange={(value) => uf("priority", value)}
              options={[
                { value: "critical", label: "Critical" },
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low" },
              ]}
            />
          </FormField>
          <FormField label="Importance">
            <FormInput
              type="number"
              value={String(form.importance ?? 50)}
              onChange={(value) => uf("importance", Math.max(0, Math.min(100, Number(value) || 0)))}
            />
          </FormField>
        </div>
        <FormField label="Status">
          <FormSelect
            value={form.status}
            onChange={(value) => uf("status", value)}
            options={[
              { value: "ideation", label: "Ideation" },
              { value: "building", label: "Building" },
              { value: "testing", label: "Testing" },
              { value: "deployed", label: "Deployed" },
            ]}
          />
        </FormField>
        <FormField label="Production URL">
          <FormInput value={form.deployedUrl} onChange={(value) => uf("deployedUrl", value)} />
        </FormField>
        <FormField label="Parent website">
          <FormInput value={form.parentWebsite || ""} onChange={(value) => uf("parentWebsite", value)} />
        </FormField>
        <FormField label="Landing / funnel page">
          <FormInput value={form.landingPage || ""} onChange={(value) => uf("landingPage", value)} />
        </FormField>
        <FormField label="Alternate live URLs">
          <FormTagsInput
            value={form.alternateUrls || []}
            onChange={(value) => uf("alternateUrls", value)}
            placeholder="https://..."
          />
        </FormField>
        <FormField label="Next highest-value action">
          <FormTextarea value={form.nextSteps} onChange={(value) => uf("nextSteps", value)} rows={3} />
        </FormField>
      </FormModal>
    </div>
  );
}
