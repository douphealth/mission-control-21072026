import { promptTitle, promptCategory } from "./promptOrganization";
import Papa from "papaparse";
import type { Note, LinkItem } from "./db";

export type LibraryMode = "prompts" | "links";
export type LibraryRecord = Omit<Partial<Note>, "kind"> & Omit<Partial<LinkItem>, "kind"> & { kind?: "ai-prompt" | "note" | "standard" | "affiliate" };
export type IntakeResult = { rows: LibraryRecord[]; errors: string[] };
export const LIBRARY_IMPORT_LIMIT = 1000;
export const LIBRARY_TEXT_LIMIT = 1_000_000;

const text = (v: unknown) => typeof v === "string" ? v : v == null ? "" : String(v);
export function libraryTags(value: unknown): string[] {
  const values = Array.isArray(value) ? value : text(value).split(/[,;]/);
  return [...new Set(values.map(v => text(v).trim()).filter(Boolean))].slice(0, 50);
}
export function promptVariables(content: string): string[] {
  return [...new Set([...content.matchAll(/\{\{\s*([\p{L}\p{N}_ .-]{1,60})\s*\}\}/gu)]
    .map(match => match[1].trim()))];
}
export function renderPrompt(content: string, values: Record<string, string>): string {
  return content.replace(/\{\{\s*([\p{L}\p{N}_ .-]{1,60})\s*\}\}/gu,
    (original, key: string) => Object.hasOwn(values, key.trim()) ? values[key.trim()] : original);
}
export function safeLibraryUrl(value: unknown): string {
  let raw = text(value).trim();
  if (!raw) throw new Error("A link needs a URL.");
  if (!/^[a-z][a-z\d+.-]*:/i.test(raw)) raw = `https://${raw}`;
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Enter a valid HTTP or HTTPS URL."); }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || !url.hostname.includes(".")) {
    throw new Error("Use an HTTP or HTTPS URL without embedded credentials.");
  }
  // Never reconstruct searchParams: signed URLs and affiliate attribution must be preserved.
  return raw;
}
export function inferredLinkKind(row: Partial<LinkItem>): "affiliate" | "standard" {
  if (row.kind === "affiliate" || row.kind === "standard") return row.kind;
  try {
    const url = new URL(row.url || "");
    if (/^(?:www\.)?amzn\.to$/i.test(url.hostname) ||
      [...url.searchParams.keys()].some(key => /^(tag|aff|affiliate|affiliate_id|aff_id|ref|refid|irclickid|clickref)$/i.test(key))) return "affiliate";
  } catch { /* Old malformed records remain editable. */ }
  return "standard";
}
export function inferAffiliateVertical(value: string): string {
  const v = value.toLowerCase();
  if (/hosting|cloudways|bluehost|digitalocean|domain|server|vps/.test(v)) return "Hosting & infrastructure";
  if (/seo|keyword|search|rank|backlink/.test(v)) return "SEO & analytics";
  if (/ai tool|chatgpt|claude|copywriter|automation/.test(v)) return "AI & content tools";
  if (/email marketing|newsletter|convertkit|aweber|mailchimp/.test(v)) return "Email marketing";
  if (/social media|socialbee|publer|tiktok|instagram/.test(v)) return "Social media";
  if (/freelanc|fiverr|marketplace/.test(v)) return "Freelance & services";
  if (/fitness|running|health/.test(v)) return "Fitness & health";
  if (/garden|plant|home/.test(v)) return "Home & garden";
  if (/marketing|affiliate|referral/.test(v)) return "Affiliate marketing";
  return "Other";
}
export const suggestPromptTitle = promptTitle;
export const suggestPromptCategory = promptCategory;
export const inferredPromptCategory = promptCategory;
function inferredCategory(content: string, title = ""): string { return promptCategory(content, title); }
export function normalizeLibraryRecord(mode: LibraryMode, value: unknown): LibraryRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Each entry must be a record.");
  const item = value as Record<string, unknown>;
  const now = new Date().toISOString();
  const status = item.status === "archived" ? "archived" : "active";
  const pinned = item.pinned === true || item.pinned === "true";
  const title = text(item.title ?? item.name).trim();
  const tags = libraryTags(item.tags);
  if (mode === "prompts") {
    const content = text(item.content ?? item.prompt ?? item.text ?? item.body);
    if (!content.trim()) throw new Error("A prompt needs content.");
    if (content.length > 200_000) throw new Error("A prompt can contain at most 200,000 characters.");
    return {
      kind: "ai-prompt", title: title || suggestPromptTitle(content),
      content, category: text(item.category).trim() || inferredCategory(content, title || suggestPromptTitle(content)),
      model: text(item.model).trim() || "Any model", tags, variables: promptVariables(content),
      pinned, status, color: text(item.color) || "emerald",
      createdAt: text(item.createdAt) || now, updatedAt: now,
    };
  }
  const url = safeLibraryUrl(item.url ?? item.link ?? item.affiliateUrl);
  const legacy = text(item.description ?? item.notes);
  const audits: Record<string, string> = {};
  const retained = legacy.split(/\r?\n/).filter(line => {
    const match = line.match(/^(Strategy status|Verdict|HTTP|Final URL|Tracking evidence|Affiliate Dashboard|Type):\s*(.*)$/i);
    if (!match) return true;
    const mapping: Record<string, string> = { "strategy status":"strategyStatus",verdict:"verdict",http:"httpStatus","final url":"finalUrl","tracking evidence":"trackingEvidence","affiliate dashboard":"affiliateDashboard",type:"linkType" };
    const name = mapping[match[1].toLowerCase()];
    if (!name || text(item[name]).trim()) return true;
    audits[name] = match[2];
    return false;
  });
  const parsed = new URL(url);
  const kind = inferredLinkKind({ ...item, url } as Partial<LinkItem>);
  const amazon = /^(?:[^.]+\.)?amazon\.(?:com|co\.uk|de|fr|it|es|ca|com\.au|co\.jp|in)$/.test(parsed.hostname) || parsed.hostname === "amzn.to";
  return {
    title: title || parsed.hostname, url, kind, category: text(item.category).trim() || (kind === "affiliate" ? "Affiliate" : "Tools"),
    description: retained.join("\n"), tags, pinned, status,
    merchant: text(item.merchant).trim() || (amazon ? "Amazon" : ""),
    network: text(item.network).trim() || (amazon ? "Amazon Associates" : ""),
    website: text(item.website).trim(), campaign: text(item.campaign).trim(),
    trackingId: text(item.trackingId).trim() || parsed.searchParams.get("tag") || parsed.searchParams.get("aff_id") || "",
    commissionNotes: text(item.commissionNotes), disclosure: text(item.disclosure),
    dateAdded: text(item.dateAdded) || now.slice(0, 10),
    vertical: text(item.vertical).trim() || inferAffiliateVertical([title, item.category, item.merchant, item.network, url].map(text).join(" ")),
    linkType: text(item.linkType).trim() || audits.linkType || "",
    strategyStatus: text(item.strategyStatus).trim() || audits.strategyStatus || "",
    verdict: text(item.verdict).trim() || audits.verdict || "",
    httpStatus: text(item.httpStatus).trim() || audits.httpStatus || "",
    finalUrl: text(item.finalUrl).trim() || audits.finalUrl || "",
    trackingEvidence: text(item.trackingEvidence).trim() || audits.trackingEvidence || "",
    affiliateDashboard: text(item.affiliateDashboard).trim() || audits.affiliateDashboard || "",
  };
}

/** Deterministic local parsing. Never sends prompts, links or credentials to a provider. */
export function parseLibraryIntake(mode: LibraryMode, input: string): IntakeResult {
  const errors: string[] = [];
  const rows: LibraryRecord[] = [];
  if (input.length > LIBRARY_TEXT_LIMIT) return { rows, errors: ["Paste or upload at most 1 MB at a time."] };
  if (!input.trim()) return { rows, errors: ["Add at least one entry."] };
  const trimmed = input.trim();
  let values: unknown[];
  const firstLine = trimmed.split(/\r?\n/, 1)[0];
  const headers = firstLine.toLowerCase().replaceAll('"', "").split(/[,\t]/).map(v => v.trim());
  try {
    if (/^(?:\[\s*(?:\{|"|\])|\{\s*")/.test(trimmed)) {
      const json = JSON.parse(trimmed);
      const entries = Array.isArray(json) ? json : json[mode] ?? json.items ?? [json];
      if (!Array.isArray(entries)) throw new Error("JSON must contain an array of records.");
      values = entries;
    } else if (headers.some(h => mode === "prompts" ? ["content", "prompt", "body"].includes(h) : ["url", "link", "affiliateurl"].includes(h)) && /[,\t]/.test(firstLine)) {
      const aliases: Record<string, string> = { name: "title", prompt: "content", body: "content", link: "url", affiliateurl: "url", trackingid: "trackingId", commissionnotes: "commissionNotes" };
      const parsed = Papa.parse<Record<string, string>>(input, {
        header: true, skipEmptyLines: "greedy", delimiter: firstLine.includes("\t") ? "\t" : ",",
        transformHeader: h => aliases[h.trim().toLowerCase()] ?? h.trim().toLowerCase(),
      });
      if (parsed.errors.length) throw new Error(`Invalid table: ${parsed.errors[0].message}`);
      values = parsed.data;
    } else if (mode === "prompts") {
      // Blank lines, Markdown rules and numbered steps belong to the original prompt.
      values = input.split(/^---PROMPT---\s*$/m).filter(chunk => chunk.trim()).map(content => ({ content }));
    } else {
      values = trimmed.split(/\r?\n/).filter(line => line.trim()).map(line => {
        const markdown = line.trim().match(/^\[([^\]]+)\]\((https?:\/\/.*)\)$/);
        if (markdown) return { title: markdown[1], url: markdown[2] };
        const fields = line.split("\t");
        if (fields.length > 1) return { title: fields[0], url: fields[1], tags: fields[2] || "" };
        return { url: line.trim() };
      });
    }
    if (values.length > LIBRARY_IMPORT_LIMIT) throw new Error(`Import at most ${LIBRARY_IMPORT_LIMIT} entries per batch.`);
    if (!values.length) throw new Error("No entries found.");
    values.forEach((value, index) => {
      try { rows.push(normalizeLibraryRecord(mode, typeof value === "string" ? mode === "prompts" ? { content: value } : { url: value } : value)); }
      catch (error) { errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : "Invalid entry."}`); }
    });
  } catch (error) { errors.push(error instanceof Error ? error.message : "Could not read this input."); }
  return { rows, errors };
}
