import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ─── Real infrastructure connectors ────────────────────────────────────────────
// These never fabricate data. Missing token → not_connected. API error → error.

type TruthState = "live" | "not_connected" | "error";

const nowIso = () => new Date().toISOString();

async function json(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${body.slice(0, 240)}`);
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
}

export const getCloudflareZones = createServerFn({ method: "GET" }).handler(async () => {
  const token = process.env["CLOUDFLARE_API_TOKEN"];
  const fetchedAt = nowIso();
  if (!token) {
    return {
      truthState: "not_connected" as TruthState,
      source: "Cloudflare API",
      fetchedAt,
      error: null,
      zones: [] as CloudflareZoneRow[],
    };
  }
  try {
    const data = await json("https://api.cloudflare.com/client/v4/zones?per_page=50", token);
    if (data?.success === false) {
      throw new Error(
        (data.errors ?? []).map((e: any) => e.message).join("; ") ||
          "Cloudflare rejected the token",
      );
    }
    const zones: CloudflareZoneRow[] = (data?.result ?? []).map((z: any) => ({
      id: String(z.id),
      name: String(z.name),
      status: String(z.status ?? "unknown"),
      plan: String(z.plan?.name ?? "Unknown"),
      nameservers: Array.isArray(z.name_servers) ? z.name_servers.map(String) : [],
      modifiedAt: z.modified_on ?? null,
    }));
    return {
      truthState: "live" as TruthState,
      source: "Cloudflare API",
      fetchedAt,
      error: null,
      zones,
    };
  } catch (e: any) {
    return {
      truthState: "error" as TruthState,
      source: "Cloudflare API",
      fetchedAt,
      error: String(e?.message ?? e).slice(0, 300),
      zones: [] as CloudflareZoneRow[],
    };
  }
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
    const checkedAt = nowIso();
    const started = Date.now();
    try {
      const res = await fetch(data.url, { method: "GET", redirect: "follow" });
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
