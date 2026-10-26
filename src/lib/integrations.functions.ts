import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { requireCloudflareViewer } from "@/lib/cloudflareAccess.server";
import { readCloudflareRuntimeEnv } from "@/lib/cloudflareRuntimeEnv.server";
import { collectCloudflareInventory } from "@/lib/cloudflareInventory.server";

// ─── Real infrastructure connectors ────────────────────────────────────────────
// These never fabricate data. Missing token → not_connected. API error → error.

type TruthState = "live" | "not_connected" | "error";

const nowIso = () => new Date().toISOString();

async function json(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`External API returned HTTP ${res.status}`);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Unparseable response from ${new URL(url).host}`);
  }
}

export interface CloudflareZoneRow {
  id: string;
  name: string;
  status: string;
  plan: string;
  nameservers: string[];
  modifiedAt: string | null;
  accountId: string;
  dashboardUrl: string;
  dnsUrl: string;
}

export const getCloudflareZones = createServerFn({ method: "GET" }).handler(async () => {
  const environment = await readCloudflareRuntimeEnv();
  await requireCloudflareViewer(getRequest(), environment);
  const inventory = await collectCloudflareInventory(environment);
  return {
    truthState: inventory.truthState,
    source: "Cloudflare API",
    fetchedAt: inventory.fetchedAt,
    error: inventory.errors.length ? inventory.errors.join("; ").slice(0,300) : null,
    zones: inventory.zones.map(({id,name,status,plan,nameservers,modifiedAt,accountId,dashboardUrl,dnsUrl}) => ({
      id,name,status,plan,nameservers,modifiedAt,accountId,dashboardUrl,dnsUrl,
    })) as CloudflareZoneRow[],
  };
});

export interface VercelProjectRow {
  id: string;
  name: string;
  framework: string | null;
  liveUrl: string | null;
  dashboardUrl: string;
  state: string;
  branch: string | null;
  lastDeployedAt: string | null;
}

export const getVercelProjects = createServerFn({ method: "GET" }).handler(async () => {
  await requireCloudflareViewer(getRequest(), await readCloudflareRuntimeEnv());
  const token = process.env["VERCEL_API_TOKEN"];
  const fetchedAt = nowIso();
  if (!token) {
    return {
      truthState: "not_connected" as TruthState,
      source: "Vercel API",
      fetchedAt,
      error: null,
      projects: [] as VercelProjectRow[],
    };
  }
  try {
    const data = await json("https://api.vercel.com/v9/projects?limit=50", token);
    const projects: VercelProjectRow[] = (data?.projects ?? []).map((p: any) => {
      const dep = p.latestDeployments?.[0] ?? p.targets?.production ?? null;
      return {
        id: String(p.id),
        name: String(p.name),
        framework: p.framework ?? null,
        liveUrl: dep?.url ? `https://${dep.url}` : p.alias?.[0] ? `https://${p.alias[0]}` : null,
        dashboardUrl: `https://vercel.com/dashboard`,
        state: String(dep?.readyState ?? dep?.state ?? "unknown").toLowerCase(),
        branch: dep?.meta?.githubCommitRef ?? null,
        lastDeployedAt: dep?.createdAt ? new Date(dep.createdAt).toISOString() : null,
      };
    });
    return {
      truthState: "live" as TruthState,
      source: "Vercel API",
      fetchedAt,
      error: null,
      projects,
    };
  } catch (e: any) {
    return {
      truthState: "error" as TruthState,
      source: "Vercel API",
      fetchedAt,
      error: String(e?.message ?? e).slice(0, 300),
      projects: [] as VercelProjectRow[],
    };
  }
});

/** Real reachability probe used by the service tracker — no manual "operational" claims. */
export const probeEndpoint = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ url: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    await requireCloudflareViewer(getRequest(), await readCloudflareRuntimeEnv());
    const checkedAt = nowIso();
    const started = Date.now();
    try {
      const parsed = new URL(data.url);
      // Deny direct localhost/IP/intranet access and redirect-following to
      // prevent the API becoming a trivial internal-network SSRF primitive.
      if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
          parsed.port || !/^[a-z0-9.-]+$/i.test(parsed.hostname) ||
          !parsed.hostname.includes(".") ||
          /(^|\.)(localhost|local|internal|test|invalid)$/.test(parsed.hostname) ||
          /^(\d+\.){3}\d+$/.test(parsed.hostname) ||
          parsed.hostname.includes("..")) {
        throw new Error("Only public HTTPS domain endpoints may be probed");
      }
      const res = await fetch(parsed.toString(), {
        method: "GET", redirect: "manual", signal: AbortSignal.timeout(8000),
      });
      return {
        url: data.url,
        checkedAt,
        ok: res.ok,
        status: res.status,
        ms: Date.now() - started,
        error: null as string | null,
      };
    } catch (e: any) {
      return {
        url: data.url,
        checkedAt,
        ok: false,
        status: 0,
        ms: Date.now() - started,
        error: String(e?.message ?? e).slice(0, 200),
      };
    }
  });
