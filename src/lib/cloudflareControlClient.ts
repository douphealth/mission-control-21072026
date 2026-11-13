import { useCallback, useEffect, useState } from "react";
import {
  getCloudflareInventoryPart,
  getCloudflareManifest,
} from "@/lib/cloudflareControl.functions";
import type { CloudflareControlSnapshot } from "@/lib/cloudflareControlState";
import type { CloudflareInventory } from "@/lib/cloudflareInventory.server";
import { mergeCloudflareInventories, unreachableAccountPart } from "@/lib/cloudflareInventoryMerge";
import { filterDeleted, reconcileDeleted } from "@/lib/deletedResources";
import { onPrivateSnapshotsCleared, readSnapshot, writeSnapshot } from "@/lib/snapshotCache";

const TTL_MS = 60_000;
const SECTIONS = ["pages", "platform"] as const;
let cache: { at: number; value: CloudflareControlSnapshot } | null = null;
let inflight: Promise<CloudflareControlSnapshot> | null = null;
const listeners = new Set<(value: CloudflareControlSnapshot) => void>();
const DISK_KEY = "private:cloudflare-control";
let hydration: Promise<void> | null = null;
onPrivateSnapshotsCleared(() => {
  cache = null;
  hydration = Promise.resolve();
});

/**
 * Restores the last complete snapshot saved on this device so the section
 * paints instantly; its original age is kept, so the normal TTL still forces
 * a background refresh.
 */
export function hydrateCloudflareControl(): Promise<void> {
  if (!hydration) {
    hydration = readSnapshot<CloudflareControlSnapshot>(DISK_KEY).then((saved) => {
      if (!saved || cache || !saved.value?.inventory) return;
      cache = { at: saved.at, value: saved.value };
      listeners.forEach((listener) => listener(saved.value));
    });
  }
  return hydration;
}

/** Latest snapshot without a network request (null before the first load). */
export function peekCloudflareControl(): CloudflareControlSnapshot | null {
  return cache?.value ?? null;
}

async function collect(): Promise<CloudflareControlSnapshot> {
  const manifest = await getCloudflareManifest();
  if (manifest.status !== "live") {
    return {
      status: manifest.status,
      fetchedAt: manifest.fetchedAt,
      message: manifest.message,
      inventory: null,
    };
  }
  // Each account × section is its own server invocation (own subrequest budget),
  // fetched in parallel. A failed part is reported, never counted as zero.
  const jobs = manifest.accounts.flatMap((account) =>
    SECTIONS.map((section) => ({ account, section })),
  );
  const settled = await Promise.allSettled(
    jobs.map((job) =>
      getCloudflareInventoryPart({
        data: { accountId: job.account.accountId, section: job.section },
      }),
    ),
  );
  const fetchedAt = new Date().toISOString();
  const parts: CloudflareInventory[] = settled.map((result, index) =>
    result.status === "fulfilled"
      ? result.value
      : unreachableAccountPart(
          jobs[index].account.accountId,
          jobs[index].account.label,
          jobs[index].section,
          fetchedAt,
        ),
  );
  const merged = mergeCloudflareInventories(parts, fetchedAt);
  reconcileDeleted(merged.rows.map((row) => row.key), Date.now());
  const inventory = { ...merged, rows: filterDeleted(merged.rows) };
  return {
    status: inventory.truthState,
    fetchedAt,
    inventory,
    message: inventory.errors.length
      ? "Some Cloudflare accounts or API permissions failed. Review the per-account results below."
      : null,
  };
}

/** Deduplicated, briefly cached Cloudflare snapshot shared across the app. */
export function loadCloudflareControl(
  options: { force?: boolean } = {},
): Promise<CloudflareControlSnapshot> {
  if (inflight) return inflight;
  inflight = hydrateCloudflareControl()
    .then(() => {
      if (!options.force && cache && Date.now() - cache.at < TTL_MS) return cache.value;
      return collect().then((value) => {
        // A failed refresh never replaces a good snapshot already on screen.
        const keepPrevious = !value.inventory && cache?.value.inventory && value.status === "error";
        if (keepPrevious) return cache!.value;
        cache = { at: Date.now(), value };
        if (value.inventory && (value.status === "live" || value.status === "partial"))
          void writeSnapshot(DISK_KEY, value, cache.at);
        listeners.forEach((listener) => listener(value));
        return value;
      });
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Drops a deleted project from the shared and saved copies so every view updates at once. */
export function removeFromCloudflareControl(key: string): void {
  const inventory = cache?.value.inventory;
  if (!cache || !inventory) return;
  const value: CloudflareControlSnapshot = {
    ...cache.value,
    inventory: { ...inventory, rows: inventory.rows.filter((row) => row.key !== key) },
  };
  cache = { at: cache.at, value };
  void writeSnapshot(DISK_KEY, value, cache.at);
  listeners.forEach((listener) => listener(value));
}

/** React binding: shares one in-flight request and cache between components. */
export function useCloudflareControl(autoLoad = true) {
  const [snapshot, setSnapshot] = useState<CloudflareControlSnapshot | null>(peekCloudflareControl);
  const [loading, setLoading] = useState(autoLoad && !peekCloudflareControl());
  const [failure, setFailure] = useState<string | null>(null);
  const load = useCallback(async (force = false) => {
    setLoading(true);
    setFailure(null);
    try {
      const value = await loadCloudflareControl({ force });
      setSnapshot(value);
      return value;
    } catch {
      setFailure(
        "Cloudflare server function is unreachable. Confirm the live Pages deployment includes its server Worker.",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    listeners.add(setSnapshot);
    void hydrateCloudflareControl().then(() => {
      const saved = peekCloudflareControl();
      if (saved) setSnapshot(saved);
    });
    if (autoLoad) void load();
    return () => {
      listeners.delete(setSnapshot);
    };
  }, [autoLoad, load]);
  return { snapshot, loading, failure, load };
}
