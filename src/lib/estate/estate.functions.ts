/**
 * Authenticated server functions for the GitHub + Cloudflare estate.
 * Every handler checks the viewer first, never accepts caller credentials,
 * returns `Cache-Control: private, no-store`, and reports failures as safe
 * typed results instead of throwing (an uncaught rejection would surface the
 * app's fatal overlay).
 */
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { SnapshotCache } from "@/lib/estate/estateCache.server";
import { estateViewer } from "@/lib/estate/estateViewer.server";
import {
  collectGitHubEstate,
  fetchRepoLive,
  GitHubCollectorError,
} from "@/lib/estate/githubCollector.server";
import {
  CloudflareActionError,
  collectCloudflareEstate,
  getDeploymentLogs,
  listDns,
  listPagesDeployments,
  pagesDeploymentAction,
  purgeZone,
} from "@/lib/estate/cloudflareCollector.server";
import type {
  CfDeployment,
  DeploymentLogLine,
  DetailResult,
  DnsRecord,
  EstateResponse,
  EstateSnapshot,
  RepoLive,
} from "@/lib/estate/types";

const cache = new SnapshotCache<EstateSnapshot>();

const ACCOUNT_ID = z.string().regex(/^[a-f0-9]{32}$/i);
const RESOURCE = z.string().regex(/^[a-zA-Z0-9_.-]{1,160}$/);
const DEPLOYMENT = z.string().regex(/^[a-zA-Z0-9-]{6,64}$/);
const GH_NAME = z.string().regex(/^[A-Za-z0-9_.-]{1,100}$/);

function safeMessage(err: unknown): string {
  if (err instanceof CloudflareActionError || err instanceof GitHubCollectorError)
    return err.message;
  const m = err instanceof Error ? err.message : "";
  if (/^Cloudflare HTTP \d{3}( \(CF code \d+\))?$/.test(m)) return m;
  if (err instanceof Error && err.name === "TimeoutError")
    return "The provider did not answer in time";
  return "Request failed";
}

async function detail<T>(
  run: (env: Record<string, string | undefined>) => Promise<T>,
): Promise<DetailResult<T>> {
  setResponseHeader("Cache-Control", "private, no-store");
  const viewer = await estateViewer();
  if (viewer.gate !== "ok") return { ok: false, gate: viewer.gate, message: viewer.message };
  try {
    return { ok: true, data: await run(viewer.env) };
  } catch (err) {
    return { ok: false, gate: "error", message: safeMessage(err) };
  }
}

export const getEstate = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ force: z.boolean().optional() }).parse(d ?? {}))
  .handler(async ({ data }): Promise<EstateResponse> => {
    setResponseHeader("Cache-Control", "private, no-store");
    const viewer = await estateViewer();
    if (viewer.gate !== "ok")
      return { gate: viewer.gate, message: viewer.message, snapshot: null, cached: false };
    try {
      const [snapshot, cached] = await cache.get(async () => {
        const [github, cloudflare] = await Promise.all([
          collectGitHubEstate(viewer.env),
          collectCloudflareEstate(viewer.env),
        ]);
        return {
          version: 1,
          fetchedAt: new Date().toISOString(),
          github,
          cloudflare,
        } satisfies EstateSnapshot;
      }, Boolean(data.force));
      return { gate: "ok", message: null, snapshot, cached };
    } catch {
      return {
        gate: "unavailable",
        message: "Estate collection failed. Check the server runtime and token permissions.",
        snapshot: null,
        cached: false,
      };
    }
  });

export const getRepoLiveDetail = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ owner: GH_NAME, name: GH_NAME, account: z.string().max(60).nullable() }).parse(d),
  )
  .handler(
    ({ data }): Promise<DetailResult<RepoLive>> => detail((env) => fetchRepoLive(env, data)),
  );

export const getPagesDeployments = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ accountId: ACCOUNT_ID, project: RESOURCE }).parse(d))
  .handler(
    ({ data }): Promise<DetailResult<CfDeployment[]>> =>
      detail((env) => listPagesDeployments(env, data.accountId, data.project)),
  );

export const getPagesDeploymentLogs = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ accountId: ACCOUNT_ID, project: RESOURCE, deploymentId: DEPLOYMENT }).parse(d),
  )
  .handler(
    ({ data }): Promise<DetailResult<{ lines: DeploymentLogLine[]; total: number }>> =>
      detail((env) => getDeploymentLogs(env, data.accountId, data.project, data.deploymentId)),
  );

export const getZoneDnsRecords = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ accountId: ACCOUNT_ID, zoneId: ACCOUNT_ID }).parse(d))
  .handler(
    ({ data }): Promise<DetailResult<DnsRecord[]>> =>
      detail((env) => listDns(env, data.accountId, data.zoneId)),
  );

/** Production action: retry or roll back a Pages deployment. Requires the typed project name. */
export const runPagesDeploymentAction = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        accountId: ACCOUNT_ID,
        project: RESOURCE,
        deploymentId: DEPLOYMENT,
        action: z.enum(["retry", "rollback"]),
        confirmName: z.string().max(160),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<DetailResult<CfDeployment | null>> => {
    const result = await detail((env) => pagesDeploymentAction(env, data));
    if (result.ok) cache.clear();
    return result;
  });

/** Production action: purge everything cached for a zone. Requires the typed zone name. */
export const runZonePurge = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({ accountId: ACCOUNT_ID, zoneId: ACCOUNT_ID, confirmName: z.string().max(253) })
      .parse(d),
  )
  .handler(
    ({ data }): Promise<DetailResult<{ zone: string }>> => detail((env) => purgeZone(env, data)),
  );
