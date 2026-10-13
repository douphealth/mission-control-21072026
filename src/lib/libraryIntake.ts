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
function inferredCategory(content: string): string {
  if (/\b(seo|keyword|serp|indexation)\b/i.test(content)) return "SEO & content";
  if (/\b(code|typescript|python|debug|function|repository)\b/i.test(content)) return "Development";
  if (/\b(email|campaign|marketing|affiliate)\b/i.test(content)) return "Marketing";
  return "General";
}
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
      kind: "ai-prompt", title: title || content.split(/\r?\n/).find(line => line.trim())!.replace(/^#+\s*/, "").trim().slice(0, 100),
      content, category: text(item.category).trim() || inferredCategory(content),
      model: text(item.model).trim() || "Any model", tags, variables: promptVariables(content),
      pinned, status, color: text(item.color) || "emerald",
      createdAt: text(item.createdAt) || now, updatedAt: now,
    };
  }
  const url = safeLibraryUrl(item.url ?? item.link ?? item.affiliateUrl);
  const parsed = new URL(url);
  const kind = inferredLinkKind({ ...item, url } as Partial<LinkItem>);
  const amazon = /^(?:[^.]+\.)?amazon\.(?:com|co\.uk|de|fr|it|es|ca|com\.au|co\.jp|in)$/.test(parsed.hostname) || parsed.hostname === "amzn.to";
  return {
    title: title || parsed.hostname, url, kind, category: text(item.category).trim() || (kind === "affiliate" ? "Affiliate" : "Tools"),
    description: text(item.description ?? item.notes), tags, pinned, status,
    merchant: text(item.merchant).trim() || (amazon ? "Amazon" : ""),
    network: text(item.network).trim() || (amazon ? "Amazon Associates" : ""),
    website: text(item.website).trim(), campaign: text(item.campaign).trim(),
    trackingId: text(item.trackingId).trim() || parsed.searchParams.get("tag") || parsed.searchParams.get("aff_id") || "",
    commissionNotes: text(item.commissionNotes), disclosure: text(item.disclosure),
    dateAdded: text(item.dateAdded) || now.slice(0, 10),
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
