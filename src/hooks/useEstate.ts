import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getEstate } from "@/lib/estate/estate.functions";
import { loadCachedSnapshot, saveCachedSnapshot } from "@/lib/estate/snapshotStore";
import {
  attentionItems,
  EMPTY_ANNOTATION,
  linkEstate,
  repoKey,
  summarize,
  type RepoAnnotation,
  type RepoRow,
} from "@/lib/estate/model";
import type { EstateGate, EstateResponse, EstateSnapshot } from "@/lib/estate/types";
import {
  useAddItem,
  useBulkAddItems,
  useBulkPatch,
  useRepos,
  useUpdateItem,
} from "@/hooks/useTableData";
import type { GitHubRepo } from "@/lib/db";
import { REPO_PORTFOLIO_META } from "@/lib/repoPortfolioMeta";
import { getGitHubRepoKey } from "@/lib/unifiedGitHubCatalog";

const LIVE_KEY = ["estate", "live"] as const;
const CACHED_KEY = ["estate", "cached"] as const;
/** The server keeps its own warm copy; the browser revisits after this window. */
const STALE_MS = 2 * 60_000;

async function fetchEstate(force: boolean): Promise<EstateResponse> {
  try {
    const res = await getEstate({ data: { force } });
    if (res.snapshot) void saveCachedSnapshot(res.snapshot);
    return res;
  } catch {
    return {
      gate: "unavailable",
      message:
        "Mission Control's server did not answer. Showing the last saved snapshot if there is one.",
      snapshot: null,
      cached: false,
    };
  }
}

export type EstateFreshness = "live" | "cached" | "none";

export interface EstateState {
  snapshot: EstateSnapshot | null;
  freshness: EstateFreshness;
  gate: EstateGate | null;
  message: string | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
}

/** Last snapshot from IndexedDB first, then the live server answer. */
export function useEstate(): EstateState {
  const qc = useQueryClient();
  const cached = useQuery({
    queryKey: CACHED_KEY,
    queryFn: loadCachedSnapshot,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const live = useQuery({
    queryKey: LIVE_KEY,
    queryFn: () => fetchEstate(false),
    staleTime: STALE_MS,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
  const mutation = useMutation({
    mutationFn: () => fetchEstate(true),
    onSuccess: (res) => {
      qc.setQueryData(LIVE_KEY, res);
      if (res.snapshot) {
        qc.setQueryData(CACHED_KEY, res.snapshot);
        const gh = res.snapshot.github.repos.length;
        const cf = res.snapshot.cloudflare.pages.length + res.snapshot.cloudflare.workers.length;
        toast.success("Estate refreshed · " + gh + " repositories · " + cf + " Cloudflare apps");
      } else toast.error(res.message ?? "Refresh failed");
    },
  });
  const refresh = useCallback(async () => {
    await mutation.mutateAsync().catch(() => undefined);
  }, [mutation]);
  const liveSnap = live.data?.snapshot ?? null;
  const snapshot = liveSnap ?? cached.data ?? null;
  return {
    snapshot,
    freshness: liveSnap ? "live" : snapshot ? "cached" : "none",
    gate: live.data?.gate ?? null,
    message: live.data?.message ?? null,
    loading: !snapshot && (live.isLoading || cached.isLoading),
    refreshing: mutation.isPending || (live.isFetching && Boolean(snapshot)),
    refresh,
  };
}

/**
 * Snapshot for passive consumers (command palette): whatever is already in
 * memory or on this device. Never triggers a provider collection itself.
 */
export function useEstateSnapshotPassive(): EstateSnapshot | null {
  const live = useQuery({
    queryKey: LIVE_KEY,
    queryFn: () => fetchEstate(false),
    enabled: false,
    staleTime: STALE_MS,
  });
  const cached = useQuery({
    queryKey: CACHED_KEY,
    queryFn: loadCachedSnapshot,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return live.data?.snapshot ?? cached.data ?? null;
}

/** Mission Control planning data (Dexie + cloud sync) keyed by lowercase owner/name. */
export function useRepoAnnotations() {
  const records = useRepos();
  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const bulkPatch = useBulkPatch();
  const bulkAddItems = useBulkAddItems();

  const map = useMemo(() => {
    const m = new Map<string, RepoAnnotation>();
    for (const r of records) {
      const key = getGitHubRepoKey(r.url);
      if (!key || m.has(key)) continue;
      const meta = key.startsWith("douphealth/") ? REPO_PORTFOLIO_META[r.name] : undefined;
      m.set(key, {
        recordId: r.id,
        priority: r.priority ?? null,
        status: r.status ?? null,
        pinned: Boolean(r.pinned),
        tags: Array.isArray(r.tags) ? r.tags : [],
        notes: r.notes ?? "",
        nextAction: r.pendingSummary || meta?.nextAction || "",
        category: meta?.category ?? null,
        importance: typeof r.importance === "number" ? r.importance : null,
      });
    }
    return m;
  }, [records]);

  const toRecord = (row: RepoRow, patch: Partial<GitHubRepo>): Omit<GitHubRepo, "id"> => ({
    name: row.name,
    url: row.url,
    description: row.description ?? "",
    language: row.primaryLanguage ?? "",
    stars: row.stars,
    forks: row.forks,
    status: row.isArchived ? "archived" : "active",
    demoUrl: row.homepage ?? "",
    progress: 0,
    topics: row.topics,
    lastUpdated: (row.pushedAt ?? row.updatedAt).slice(0, 10),
    visibility: row.isPrivate ? "private" : "public",
    defaultBranch: row.defaultBranch ?? undefined,
    ...patch,
  });

  const save = useCallback(
    async (rows: RepoRow[], patch: Partial<GitHubRepo>) => {
      const existing = rows.filter((r) => r.annotation.recordId).map((r) => r.annotation.recordId!);
      const fresh = rows.filter((r) => !r.annotation.recordId).map((r) => toRecord(r, patch));
      try {
        if (existing.length === 1 && !fresh.length)
          await updateItem<GitHubRepo>("repos", existing[0]!, patch);
        else if (existing.length) await bulkPatch("repos", existing, patch);
        if (fresh.length === 1 && !existing.length) await addItem<GitHubRepo>("repos", fresh[0]!);
        else if (fresh.length) await bulkAddItems<GitHubRepo>("repos", fresh);
        return true;
      } catch {
        toast.error("Planning change was not saved. Try again.");
        return false;
      }
    },
    [addItem, updateItem, bulkPatch, bulkAddItems],
  );

  return { map, save };
}

/** Linked rows + summary for the current snapshot, with annotations applied. */
export function useLinkedEstate(
  snapshot: EstateSnapshot | null,
  annotations: Map<string, RepoAnnotation>,
) {
  return useMemo(() => {
    if (!snapshot) return null;
    const linked = linkEstate(snapshot, annotations);
    return {
      linked,
      summary: summarize(linked, snapshot.cloudflare.zones.length),
      attention: attentionItems(linked, snapshot),
    };
  }, [snapshot, annotations]);
}

export const annotationFor = (map: Map<string, RepoAnnotation>, fullName: string) =>
  map.get(repoKey(fullName)) ?? EMPTY_ANNOTATION;
