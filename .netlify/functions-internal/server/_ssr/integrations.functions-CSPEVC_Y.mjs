import { r as createServerFn } from "./server-BEODbGZS.mjs";
import { a as stringType, i as objectType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-BUblNgf4.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/integrations.functions-CSPEVC_Y.js
var nowIso = () => (/* @__PURE__ */ new Date()).toISOString();
async function json(url, token) {
	const res = await fetch(url, { headers: {
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json"
	} });
	const body = await res.text();
	if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${body.slice(0, 240)}`);
	try {
		return JSON.parse(body);
	} catch {
		throw new Error(`Unparseable response from ${new URL(url).host}`);
	}
}
var getCloudflareZones_createServerFn_handler = createServerRpc({
	id: "55a57477e5d182ec376ea00473f8aa6bff067cde139eeaed8cda7851b80ad793",
	name: "getCloudflareZones",
	filename: "src/lib/integrations.functions.ts"
}, (opts) => getCloudflareZones.__executeServer(opts));
var getCloudflareZones = createServerFn({ method: "GET" }).handler(getCloudflareZones_createServerFn_handler, async () => {
	const token = process.env["CLOUDFLARE_API_TOKEN"];
	const fetchedAt = nowIso();
	if (!token) return {
		truthState: "not_connected",
		source: "Cloudflare API",
		fetchedAt,
		error: null,
		zones: []
	};
	try {
		const data = await json("https://api.cloudflare.com/client/v4/zones?per_page=50", token);
		if (data?.success === false) throw new Error((data.errors ?? []).map((e) => e.message).join("; ") || "Cloudflare rejected the token");
		return {
			truthState: "live",
			source: "Cloudflare API",
			fetchedAt,
			error: null,
			zones: (data?.result ?? []).map((z) => ({
				id: String(z.id),
				name: String(z.name),
				status: String(z.status ?? "unknown"),
				plan: String(z.plan?.name ?? "Unknown"),
				nameservers: Array.isArray(z.name_servers) ? z.name_servers.map(String) : [],
				modifiedAt: z.modified_on ?? null
			}))
		};
	} catch (e) {
		return {
			truthState: "error",
			source: "Cloudflare API",
			fetchedAt,
			error: String(e?.message ?? e).slice(0, 300),
			zones: []
		};
	}
});
var getVercelProjects_createServerFn_handler = createServerRpc({
	id: "bb98a6f4ecc5b868002524cb465d4f809b43ff8ce78a0679cb44c97f80636ed1",
	name: "getVercelProjects",
	filename: "src/lib/integrations.functions.ts"
}, (opts) => getVercelProjects.__executeServer(opts));
var getVercelProjects = createServerFn({ method: "GET" }).handler(getVercelProjects_createServerFn_handler, async () => {
	const token = process.env["VERCEL_API_TOKEN"];
	const fetchedAt = nowIso();
	if (!token) return {
		truthState: "not_connected",
		source: "Vercel API",
		fetchedAt,
		error: null,
		projects: []
	};
	try {
		return {
			truthState: "live",
			source: "Vercel API",
			fetchedAt,
			error: null,
			projects: ((await json("https://api.vercel.com/v9/projects?limit=50", token))?.projects ?? []).map((p) => {
				const dep = p.latestDeployments?.[0] ?? p.targets?.production ?? null;
				return {
					id: String(p.id),
					name: String(p.name),
					framework: p.framework ?? null,
					liveUrl: dep?.url ? `https://${dep.url}` : p.alias?.[0] ? `https://${p.alias[0]}` : null,
					dashboardUrl: `https://vercel.com/dashboard`,
					state: String(dep?.readyState ?? dep?.state ?? "unknown").toLowerCase(),
					branch: dep?.meta?.githubCommitRef ?? null,
					lastDeployedAt: dep?.createdAt ? new Date(dep.createdAt).toISOString() : null
				};
			})
		};
	} catch (e) {
		return {
			truthState: "error",
			source: "Vercel API",
			fetchedAt,
			error: String(e?.message ?? e).slice(0, 300),
			projects: []
		};
	}
});
var probeEndpoint_createServerFn_handler = createServerRpc({
	id: "f0ae3c4b18014f9bf6bd5895b5009e8f1c45602c9b296e516393bef8914d4799",
	name: "probeEndpoint",
	filename: "src/lib/integrations.functions.ts"
}, (opts) => probeEndpoint.__executeServer(opts));
var probeEndpoint = createServerFn({ method: "POST" }).inputValidator((d) => objectType({ url: stringType().url() }).parse(d)).handler(probeEndpoint_createServerFn_handler, async ({ data }) => {
	const checkedAt = nowIso();
	const started = Date.now();
	try {
		const res = await fetch(data.url, {
			method: "GET",
			redirect: "follow"
		});
		return {
			url: data.url,
			checkedAt,
			ok: res.ok,
			status: res.status,
			ms: Date.now() - started,
			error: null
		};
	} catch (e) {
		return {
			url: data.url,
			checkedAt,
			ok: false,
			status: 0,
			ms: Date.now() - started,
			error: String(e?.message ?? e).slice(0, 200)
		};
	}
});
//#endregion
export { getCloudflareZones_createServerFn_handler, getVercelProjects_createServerFn_handler, probeEndpoint_createServerFn_handler };
