import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertOctagon,
  AlertTriangle,
  Cloud,
  Copy,
  Database,
  Eraser,
  ExternalLink,
  Globe,
  Info,
  Rocket,
  Search,
  Server,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { ConnectorEmpty } from "@/components/TruthUI";
import { useEstate, useLinkedEstate, useRepoAnnotations } from "@/hooks/useEstate";
import { getZoneDnsRecords, runZonePurge } from "@/lib/estate/estate.functions";
import { sourceRepoState, type AttentionItem, type SourceRepoState } from "@/lib/estate/model";
import type { CfZone, GitHubAccountStatus, PagesHealth } from "@/lib/estate/types";
import { useEstateViewStore } from "@/stores/estateViewStore";
import { useNavigationStore } from "@/stores/navigationStore";
import { cn } from "@/lib/utils";
import {
  ago,
  ExtLink,
  PagesHealthPill,
  Pill,
  SkeletonRows,
  StatTile,
  TypedConfirm,
} from "@/components/estate/bits";
import { EstateGateNotice, FreshnessLine, RefreshButton } from "@/components/estate/EstateStatus";
import PagesDrawer from "@/components/estate/PagesDrawer";
import { useSectionKeys } from "@/components/estate/useSectionKeys";

const CloudflareEstatePanel = lazy(
  () => import("@/components/controlcenter/CloudflareEstatePanel"),
);

type Tab = "attention" | "pages" | "workers" | "zones" | "storage" | "accounts";

export default function CloudflareCommandCenter() {
  const estate = useEstate();
  const { map } = useRepoAnnotations();
  const derived = useLinkedEstate(estate.snapshot, map);
  const tab = useEstateViewStore((s) => s.cfTab);
  const setTab = useEstateViewStore((s) => s.setCfTab);
  const focusEntity = useNavigationStore((s) => s.focusEntity);
  const setFocusEntity = useNavigationStore((s) => s.setFocusEntity);
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const searchRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [account, setAccount] = useState("all");
  const [health, setHealth] = useState<"all" | PagesHealth>("all");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const refresh = useCallback(() => void estate.refresh(), [estate]);
  useSectionKeys(searchRef, refresh);

  const cf = estate.snapshot?.cloudflare;
  const s = derived?.summary;
  const pages = derived?.linked.pages ?? [];
  const workers = derived?.linked.workers ?? [];
  const zones = cf?.zones ?? [];
  // Cloudflare-side problems only; CI and PR items live in the GitHub section.
  const attention = (derived?.attention ?? []).filter(
    (a) => a.kind === "deploy_failed" || (a.kind === "account" && a.id.startsWith("cf-")),
  );
  const openProject = pages.find((p) => p.key === openKey) ?? null;

  useEffect(() => {
    if (!focusEntity || !pages.length) return;
    if (focusEntity.type === "cf-pages" || focusEntity.type === "pages") {
      setTab("pages");
      setOpenKey(focusEntity.id);
      setFocusEntity(null);
    } else if (focusEntity.type === "cf-worker") {
      setTab("workers");
      setQ(focusEntity.label ?? "");
      setFocusEntity(null);
    } else if (focusEntity.type === "cf-zone") {
      setTab("zones");
      setQ(focusEntity.label ?? "");
      setFocusEntity(null);
    }
  }, [focusEntity, pages.length, setFocusEntity, setTab]);

  const term = q.trim().toLowerCase();
  const inAccount = (id: string) => account === "all" || account === id;
  const fPages = useMemo(
    () =>
      pages
        .filter((p) => inAccount(p.accountId) && (health === "all" || p.health === health))
        .filter(
          (p) =>
            !term ||
            [
              p.name,
              p.url,
              ...p.domains,
              p.linkedRepo,
              p.source.repo,
              p.latestDeployment?.commitMessage,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(term),
        )
        .sort(
          (a, b) =>
            rankHealth(a.health) - rankHealth(b.health) ||
            (b.latestDeployment?.createdOn ?? "").localeCompare(
              a.latestDeployment?.createdOn ?? "",
            ),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pages, account, health, term],
  );
  const fWorkers = useMemo(
    () =>
      workers
        .filter((w) => inAccount(w.accountId))
        .filter(
          (w) =>
            !term ||
            [w.name, ...w.routes, ...w.customDomains, w.linkedRepo]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(term),
        )
        .sort((a, b) => (b.modifiedOn ?? "").localeCompare(a.modifiedOn ?? "")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workers, account, term],
  );
  const fZones = useMemo(
    () =>
      zones
        .filter((z) => inAccount(z.accountId))
        .filter((z) => !term || z.name.includes(term))
        .sort((a, b) => a.name.localeCompare(b.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zones, account, term],
  );

  const openTarget = (a: AttentionItem) => {
    if (a.target.type === "pages") setOpenKey(a.target.key);
    else if (a.target.type === "repo") {
      setFocusEntity({ type: "repo", id: a.target.key });
      setActiveSection("github");
    } else setTab("accounts");
  };

  const TABS: { id: Tab; label: string; icon: typeof Cloud; count?: number; tone?: "bad" }[] = [
    {
      id: "attention",
      label: "Needs attention",
      icon: AlertTriangle,
      count: attention.filter((a) => a.severity !== "info").length,
      tone: "bad",
    },
    { id: "pages", label: "Pages", icon: Rocket, count: pages.length },
    { id: "workers", label: "Workers", icon: Server, count: workers.length },
    { id: "zones", label: "Zones & DNS", icon: Globe, count: zones.length },
    { id: "storage", label: "Storage", icon: Database },
    { id: "accounts", label: "Accounts", icon: Users, count: cf?.accounts.length },
  ];
  const searchable = tab === "pages" || tab === "workers" || tab === "zones";

  return (
    <section className="space-y-4" aria-label="Cloudflare command center">
      <PageHeader
        icon={Cloud}
        eyebrow="Edge estate"
        title="Cloudflare"
        tone="amber"
        subtitle={
          cf
            ? cf.accounts.filter((a) => a.state === "live" || a.state === "partial").length +
              " of " +
              cf.accounts.length +
              " accounts connected · Pages health, Workers, zones and DNS"
            : "Pages health, deployments, build logs, Workers, zones and DNS across your Cloudflare accounts."
        }
        stats={
          s
            ? [
                { label: "Pages", value: s.pages },
                {
                  label: "Failing",
                  value: s.failingDeploys,
                  tone: s.failingDeploys ? "rose" : "muted",
                },
                { label: "Building", value: s.building, tone: "sky" },
                { label: "Workers", value: s.workers, tone: "violet" },
                { label: "Zones", value: s.zones, tone: "accent" },
              ]
            : undefined
        }
        actions={
          <>
            <a
              href="https://www.cloudflarestatus.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs"
            >
              Status <ExternalLink size={12} />
            </a>
            <RefreshButton state={estate} />
          </>
        }
      />

      <FreshnessLine state={estate} part={cf?.truthState} source="Cloudflare API" />
      <EstateGateNotice state={estate} what="Cloudflare" />
      {estate.loading && <SkeletonRows rows={8} />}

      {cf?.truthState === "not_connected" && (
        <ConnectorEmpty
          title="Cloudflare is not connected"
          description="Add CLOUDFLARE_ACCOUNT_TOKENS_JSON (account id → API token with Pages, Workers Scripts, Zone and DNS read) to the server environment. Retry, rollback and purge also need Pages Edit and Cache Purge."
          docsUrl="https://developers.cloudflare.com/fundamentals/api/get-started/create-token/"
          onRetry={refresh}
        />
      )}

      {derived && cf && cf.truthState !== "not_connected" && (
        <>
          <div
            className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-border/60 bg-card/70 p-1"
            role="tablist"
            aria-label="Cloudflare views"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                  tab === t.id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <t.icon size={13} />
                {t.label}
                {t.count !== undefined && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] tabular-nums",
                      t.tone === "bad" && t.count
                        ? "bg-red-500/15 text-red-600 dark:text-red-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {searchable && (
            <div className="flex flex-wrap items-center gap-1.5">
              <label className="flex h-8 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-border/70 bg-card/70 px-2.5 focus-within:border-primary">
                <Search size={13} className="text-muted-foreground" />
                <input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setQ("");
                    if (e.key === "Enter" && tab === "pages" && fPages[0])
                      setOpenKey(fPages[0].key);
                  }}
                  placeholder={
                    "Search " +
                    (tab === "pages"
                      ? "projects, domains, repos, commits"
                      : tab === "workers"
                        ? "workers, routes, domains"
                        : "zones") +
                    "…"
                  }
                  aria-label="Search Cloudflare"
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                aria-label="Account"
                className="h-8 rounded-lg border border-border/70 bg-card/70 px-2 text-xs"
              >
                <option value="all">All accounts</option>
                {cf.accounts.map((a) => (
                  <option key={a.accountId} value={a.accountId}>
                    {a.label}
                  </option>
                ))}
              </select>
              {tab === "pages" && (
                <select
                  value={health}
                  onChange={(e) => setHealth(e.target.value as typeof health)}
                  aria-label="Health"
                  className="h-8 rounded-lg border border-border/70 bg-card/70 px-2 text-xs"
                >
                  <option value="all">Any health</option>
                  <option value="failing">Failing</option>
                  <option value="building">Building</option>
                  <option value="healthy">Healthy</option>
                  <option value="unknown">No deploys</option>
                </select>
              )}
            </div>
          )}

          {tab === "attention" && <AttentionList items={attention} onOpen={openTarget} />}
          {tab === "pages" && (
            <PagesList
              rows={fPages}
              onOpen={setOpenKey}
              total={pages.length}
              ghAccounts={estate.snapshot?.github.accounts ?? []}
            />
          )}
          {tab === "workers" && <WorkersList rows={fWorkers} total={workers.length} />}
          {tab === "zones" && <ZonesList rows={fZones} total={zones.length} />}
          {tab === "storage" && (
            <Suspense fallback={<SkeletonRows rows={4} />}>
              <CloudflareEstatePanel inventory={null} enabled />
            </Suspense>
          )}
          {tab === "accounts" && (
            <div className="grid gap-3 md:grid-cols-2">
              {cf.accounts.map((a) => (
                <div
                  key={a.accountId}
                  className="rounded-2xl border border-border/60 bg-card/70 p-4"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        a.state === "live"
                          ? "bg-emerald-500"
                          : a.state === "partial"
                            ? "bg-amber-500"
                            : "bg-red-500",
                      )}
                    />
                    <h3 className="text-sm font-bold text-foreground">{a.label}</h3>
                    <Pill
                      tone={a.state === "live" ? "good" : a.state === "partial" ? "warn" : "bad"}
                    >
                      {a.state}
                    </Pill>
                    <ExtLink href={a.dashboardUrl} className="ml-auto text-xs">
                      Dashboard
                    </ExtLink>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {a.accountId}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <StatTile label="Pages" value={a.pagesCount} />
                    <StatTile label="Workers" value={a.workersCount} />
                    <StatTile label="Zones" value={a.zonesCount} />
                  </div>
                  {a.errors.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-amber-700 dark:text-amber-300">
                      {a.errors.map((e) => (
                        <li key={e}>• {e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <PagesDrawer
        project={openProject}
        onClose={() => setOpenKey(null)}
        onChanged={() => void estate.refresh()}
      />
    </section>
  );
}

const rankHealth = (h: PagesHealth) => ({ failing: 0, building: 1, healthy: 2, unknown: 3 })[h];

function AttentionList({
  items,
  onOpen,
}: {
  items: AttentionItem[];
  onOpen: (a: AttentionItem) => void;
}) {
  if (!items.length)
    return (
      <EmptyState
        icon={Cloud}
        title="Nothing needs attention"
        description="Every production deploy is healthy, CI is green and both accounts answer."
      />
    );
  return (
    <ul className="space-y-2">
      {items.map((a) => {
        const Icon =
          a.severity === "critical"
            ? AlertOctagon
            : a.severity === "warning"
              ? AlertTriangle
              : Info;
        return (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onOpen(a)}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl border bg-card/70 p-3 text-left transition hover:border-primary/40",
                a.severity === "critical"
                  ? "border-red-500/30"
                  : a.severity === "warning"
                    ? "border-amber-500/30"
                    : "border-border/60",
              )}
            >
              <Icon
                size={16}
                className={cn(
                  "mt-0.5 shrink-0",
                  a.severity === "critical"
                    ? "text-red-500"
                    : a.severity === "warning"
                      ? "text-amber-500"
                      : "text-sky-500",
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{a.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{a.detail}</span>
              </span>
              {a.at && (
                <span className="shrink-0 text-[11px] text-muted-foreground">{ago(a.at)}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const SOURCE_NOTE: Record<
  Exclude<SourceRepoState, "linked" | "direct">,
  { label: string; title: string; tone: "warn" | "muted" }
> = {
  missing: {
    label: "missing",
    tone: "warn",
    title:
      "The owning GitHub account was indexed and this repository is not in it (deleted or renamed)",
  },
  not_indexed: {
    label: "not indexed",
    tone: "muted",
    title:
      "The owning GitHub account is not connected or failed, so this repository could not be checked",
  },
  external: {
    label: "other account",
    tone: "muted",
    title: "Owned by a GitHub account outside the four managed accounts",
  },
};

function PagesList({
  rows,
  onOpen,
  total,
  ghAccounts,
}: {
  rows: import("@/components/estate/PagesDrawer").LinkedPages[];
  onOpen: (k: string) => void;
  total: number;
  ghAccounts: GitHubAccountStatus[];
}) {
  if (!rows.length)
    return (
      <EmptyState
        icon={Rocket}
        title={total ? "No projects match" : "No Pages projects"}
        description={
          total ? "Change the search or filters." : "These accounts have no Pages projects."
        }
      />
    );
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/70">
      <table className="w-full min-w-[860px] text-left text-xs">
        <thead className="border-b border-border/60 bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-bold">Project</th>
            <th className="px-2 py-2 font-bold">Health</th>
            <th className="px-2 py-2 font-bold">Latest deploy</th>
            <th className="px-2 py-2 font-bold">Domains</th>
            <th className="px-2 py-2 font-bold">Source repo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {rows.map((p) => {
            const d = p.latestDeployment;
            const custom = p.domains.filter((x) => !x.endsWith(".pages.dev"));
            return (
              <tr
                key={p.key}
                tabIndex={0}
                onClick={() => onOpen(p.key)}
                onKeyDown={(e) => e.key === "Enter" && onOpen(p.key)}
                className="cursor-pointer hover:bg-primary/5 focus:bg-primary/5 focus:outline-none"
              >
                <td className="px-3 py-2">
                  <div className="font-semibold text-foreground">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.accountLabel}</div>
                </td>
                <td className="px-2 py-2">
                  <PagesHealthPill health={p.health} />
                </td>
                <td className="max-w-[300px] px-2 py-2">
                  {d ? (
                    <>
                      <div className="truncate text-foreground">{d.commitMessage ?? d.shortId}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {d.environment} · {d.branch ?? "—"} · {ago(d.createdOn)}
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">No deployments</span>
                  )}
                </td>
                <td className="max-w-[220px] px-2 py-2">
                  <div className="truncate">
                    <ExtLink href={custom[0] ? "https://" + custom[0] : p.url}>
                      {custom[0] ?? p.subdomain ?? "—"}
                    </ExtLink>
                  </div>
                  {custom.length > 1 && (
                    <div className="text-[11px] text-muted-foreground">
                      +{custom.length - 1} more
                    </div>
                  )}
                </td>
                <td className="max-w-[260px] px-2 py-2">
                  {(() => {
                    const state = sourceRepoState(p, ghAccounts);
                    if (state === "linked")
                      return (
                        <span className="block truncate font-mono text-[11px] text-foreground">
                          {p.linkedRepo}
                        </span>
                      );
                    if (state === "direct")
                      return <span className="text-muted-foreground">direct upload</span>;
                    const note = SOURCE_NOTE[state];
                    return (
                      <Pill tone={note.tone} title={note.title}>
                        <span className="max-w-[200px] truncate">
                          {p.source.owner}/{p.source.repo}
                        </span>{" "}
                        {note.label}
                      </Pill>
                    );
                  })()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WorkersList({
  rows,
  total,
}: {
  rows: import("@/lib/estate/model").LinkedEstate["workers"];
  total: number;
}) {
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const setFocusEntity = useNavigationStore((s) => s.setFocusEntity);
  if (!rows.length)
    return (
      <EmptyState
        icon={Server}
        title={total ? "No workers match" : "No Workers"}
        description={
          total ? "Change the search or account." : "These accounts have no Worker scripts."
        }
      />
    );
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {rows.map((w) => (
        <div key={w.key} className="rounded-2xl border border-border/60 bg-card/70 p-3">
          <div className="flex items-center gap-2">
            <Server size={13} className="text-violet-500" />
            <span className="truncate font-mono text-sm font-semibold text-foreground">
              {w.name}
            </span>
            <span className="text-[11px] text-muted-foreground">{w.accountLabel}</span>
            <ExtLink href={w.dashboardUrl} className="ml-auto text-[11px]">
              Open
            </ExtLink>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {w.customDomains.map((d) => (
              <Pill key={d} tone="info">
                {d}
              </Pill>
            ))}
            {w.routes.slice(0, 4).map((r) => (
              <Pill key={r}>{r}</Pill>
            ))}
            {w.routes.length > 4 && <Pill>+{w.routes.length - 4} routes</Pill>}
            {!w.customDomains.length && !w.routes.length && (
              <span className="text-[11px] text-muted-foreground">No routes or custom domains</span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {w.handlers.length > 0 && <span>{w.handlers.join(", ")}</span>}
            {w.modifiedOn && <span>· updated {ago(w.modifiedOn)}</span>}
            {w.linkedRepo && (
              <button
                type="button"
                className="ml-auto font-mono text-primary hover:underline"
                onClick={() => {
                  setFocusEntity({ type: "repo", id: w.linkedRepo! });
                  setActiveSection("github");
                }}
              >
                {w.linkedRepo}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ZonesList({ rows, total }: { rows: CfZone[]; total: number }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [purge, setPurge] = useState<CfZone | null>(null);
  if (!rows.length)
    return (
      <EmptyState
        icon={Globe}
        title={total ? "No zones match" : "No zones"}
        description={total ? "Change the search or account." : "These accounts have no zones."}
      />
    );
  return (
    <>
      <ul className="space-y-2">
        {rows.map((z) => (
          <li key={z.id} className="rounded-2xl border border-border/60 bg-card/70">
            <div className="flex flex-wrap items-center gap-2 p-3">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  z.status === "active"
                    ? "bg-emerald-500"
                    : z.status === "pending"
                      ? "bg-amber-500"
                      : "bg-red-500",
                )}
              />
              <span className="text-sm font-semibold text-foreground">{z.name}</span>
              <Pill>{z.plan}</Pill>
              {z.status !== "active" && <Pill tone="warn">{z.status}</Pill>}
              {z.paused && <Pill tone="warn">paused</Pill>}
              <span className="text-[11px] text-muted-foreground">{z.accountLabel}</span>
              <div className="ml-auto flex items-center gap-1.5">
                {z.nameServers.length > 0 && (
                  <button
                    type="button"
                    className="btn-secondary px-2 py-1 text-[11px]"
                    title={z.nameServers.join("\n")}
                    onClick={() => {
                      void navigator.clipboard?.writeText(z.nameServers.join("\n")).then(
                        () => toast.success("Nameservers copied"),
                        () => toast.error("Clipboard unavailable"),
                      );
                    }}
                  >
                    <Copy size={11} /> NS
                  </button>
                )}
                <button
                  type="button"
                  className="btn-secondary px-2 py-1 text-[11px]"
                  onClick={() => setOpenId(openId === z.id ? null : z.id)}
                  aria-expanded={openId === z.id}
                >
                  <Globe size={11} /> DNS
                </button>
                <button
                  type="button"
                  className="btn-secondary px-2 py-1 text-[11px]"
                  onClick={() => setPurge(z)}
                >
                  <Eraser size={11} /> Purge cache
                </button>
                <ExtLink href={z.dashboardUrl} className="text-[11px]">
                  Open
                </ExtLink>
              </div>
            </div>
            {openId === z.id && <DnsTable zone={z} />}
          </li>
        ))}
      </ul>
      <TypedConfirm
        open={Boolean(purge)}
        onOpenChange={(o) => !o && setPurge(null)}
        title="Purge everything cached?"
        description={
          <p>
            Cloudflare drops every cached file for <strong>{purge?.name}</strong>. Origins see a
            traffic spike until the cache warms again.
          </p>
        }
        confirmText={purge?.name ?? ""}
        actionLabel="Purge everything"
        onConfirm={async (typed) => {
          if (!purge) return;
          const res = await runZonePurge({
            data: { accountId: purge.accountId, zoneId: purge.id, confirmName: typed },
          }).catch(() => ({
            ok: false as const,
            gate: "error" as const,
            message: "Request failed",
          }));
          if (res.ok) toast.success("Cache purged for " + purge.name);
          else {
            toast.error(res.message);
            throw new Error(res.message);
          }
        }}
      />
    </>
  );
}

function DnsTable({ zone }: { zone: CfZone }) {
  const q = useQuery({
    queryKey: ["cf-dns", zone.id],
    queryFn: () => getZoneDnsRecords({ data: { accountId: zone.accountId, zoneId: zone.id } }),
    staleTime: 60_000,
  });
  if (q.isLoading)
    return (
      <div className="px-3 pb-3">
        <SkeletonRows rows={3} />
      </div>
    );
  if (!q.data?.ok)
    return (
      <p className="px-3 pb-3 text-xs text-muted-foreground">
        {q.data?.message ?? "DNS records unavailable."}
      </p>
    );
  const recs = q.data.data;
  if (!recs.length)
    return <p className="px-3 pb-3 text-xs text-muted-foreground">No DNS records.</p>;
  return (
    <div className="overflow-x-auto border-t border-border/50">
      <table className="w-full text-left text-[11px]">
        <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5">Type</th>
            <th className="px-2 py-1.5">Name</th>
            <th className="px-2 py-1.5">Content</th>
            <th className="px-2 py-1.5">Proxy</th>
            <th className="px-2 py-1.5">TTL</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {recs.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-1.5 font-bold">{r.type}</td>
              <td className="max-w-[220px] truncate px-2 py-1.5 font-mono">{r.name}</td>
              <td
                className="max-w-[320px] truncate px-2 py-1.5 font-mono text-muted-foreground"
                title={r.content}
              >
                {r.content}
              </td>
              <td className="px-2 py-1.5">
                {r.proxied ? (
                  <Pill tone="warn">proxied</Pill>
                ) : (
                  <span className="text-muted-foreground">DNS only</span>
                )}
              </td>
              <td className="px-2 py-1.5 text-muted-foreground">{r.ttl === 1 ? "auto" : r.ttl}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
