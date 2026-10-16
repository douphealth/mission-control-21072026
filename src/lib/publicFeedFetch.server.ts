/** Bounded public-data fetch; no credentials and every redirect is checked before following. */
const MAX_BYTES = 2_000_000;
export function publicFeedUrl(raw: string): URL {
  let u: URL; try { u = new URL(raw); } catch { throw new Error("Use a full public HTTP or HTTPS URL."); }
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!/^https?:$/.test(u.protocol) || u.username || u.password || !host.includes(".") || /(?:^|\.)(localhost|local|internal|invalid|onion)$/.test(host) || /^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("[") || (u.port && !["80", "443"].includes(u.port))) throw new Error("Use a public website URL without embedded credentials or private-network addresses.");
  return u;
}
export function assertFeedDocument(body: string): void {
  const prefix = body.slice(0, 8000).replace(/^\uFEFF/, "").replace(/<!--[\s\S]*?-->/g, "");
  if (!/<(?:rss|feed|rdf:RDF)(?:\s|>)/i.test(prefix) || /<(?:html|!doctype\s+html)(?:\s|>)/i.test(prefix)) throw new Error("Source returned a webpage or access challenge, not an RSS/Atom feed.");
}
async function limitedText(response: Response): Promise<string> {
  if (Number(response.headers.get("content-length")) > MAX_BYTES) { await response.body?.cancel(); throw new Error("Response exceeds the 2 MB limit."); }
  if (!response.body) return "";
  const reader = response.body.getReader(), decoder = new TextDecoder(); let bytes = 0, text = "";
  try { for (;;) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength; if (bytes > MAX_BYTES) { await reader.cancel(); throw new Error("Response exceeds the 2 MB limit."); } text += decoder.decode(part.value, { stream: true }); } return text + decoder.decode(); } finally { reader.releaseLock(); }
}
const cooldown = new Map<string, number>();
export async function fetchPublicFeed(raw: string, timeoutMs = 10_000, retries = 0): Promise<string> {
  const initial = publicFeedUrl(raw); if ((cooldown.get(initial.host) || 0) > Date.now()) throw new Error("Source is rate-limited. Wait before refreshing again.");
  const attempts = Math.min(1, Math.max(0, retries));
  for (let attempt = 0; attempt <= attempts; attempt++) {
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), Math.min(12_000, Math.max(500, timeoutMs)));
    try {
      let url = initial;
      for (let hop = 0; hop <= 3; hop++) {
        const r = await fetch(url.toString(), { signal: ctrl.signal, redirect: "manual", credentials: "omit", headers: { "User-Agent": "Mozilla/5.0 (compatible; MissionControl/2.0)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.5", "Accept-Language": "en-US,en;q=0.9,el;q=0.8" } });
        if ([301, 302, 303, 307, 308].includes(r.status)) { const location = r.headers.get("location"); await r.body?.cancel(); if (!location || hop === 3) throw new Error("Redirect limit reached."); url = publicFeedUrl(new URL(location, url).toString()); continue; }
        if (!r.ok) { await r.body?.cancel(); if ([429, 503].includes(r.status)) { if (cooldown.size > 100) cooldown.clear(); const retry = Number(r.headers.get("retry-after")); cooldown.set(initial.host, Date.now() + Math.max(60_000, Number.isFinite(retry) ? retry * 1000 : 0)); } throw new Error(`HTTP ${r.status}. ${r.status === 403 ? "Publisher blocked access." : "Source did not return readable data."}`); }
        return await limitedText(r);
      }
    } catch (e) { const error = e instanceof Error ? e : new Error("Request failed."); if (attempt >= attempts || !/HTTP (500|502|504)|abort/i.test(`${error.name} ${error.message}`)) { if (error.name === "AbortError") throw new Error("Source timed out. Other sources can still refresh."); throw error; } }
    finally { clearTimeout(timer); }
  }
  throw new Error("Request failed.");
}
