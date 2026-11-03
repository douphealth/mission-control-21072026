import { useCallback, useEffect, useState } from "react";
import {
  getCloudflareInventoryPart,
  getCloudflareManifest,
} from "@/lib/cloudflareControl.functions";
import type { CloudflareControlSnapshot } from "@/lib/cloudflareControlState";
import type { CloudflareInventory } from "@/lib/cloudflareInventory.server";
import { mergeCloudflareInventories, unreachableAccountPart } from "@/lib/cloudflareInventoryMerge";

const TTL_MS = 60_000;
const SECTIONS = ["pages", "platform"] as const;
let cache: { at: number; value: CloudflareControlSnapshot } | null = null;
let inflight: Promise<CloudflareControlSnapshot> | null = null;
const listeners = new Set<(value: CloudflareControlSnapshot) => void>();

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
  const inventory = mergeCloudflareInventories(parts, fetchedAt);
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
  if (!options.force && cache && Date.now() - cache.at < TTL_MS)
    return Promise.resolve(cache.value);
  if (inflight) return inflight;
  inflight = collect()
    .then((value) => {
      cache = { at: Date.now(), value };
      listeners.forEach((listener) => listener(value));
      return value;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
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
    if (autoLoad) void load();
    return () => {
      listeners.delete(setSnapshot);
    };
  }, [autoLoad, load]);
  return { snapshot, loading, failure, load };
}
