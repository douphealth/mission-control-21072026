import type { CredentialVault } from "@/lib/db";
import { parseCredentialsDump } from "@/lib/parseCredentialsDump";
import { todayISO } from "@/lib/overdue";

export type CredentialDraft = Omit<CredentialVault, "id">;

export interface CredentialBatchParseResult {
  items: CredentialDraft[];
  errors: string[];
  format: "hosting-dump" | "json" | "delimited" | "key-value" | "lines" | "empty";
}

const DEFAULT_CATEGORY = "General";

const HEADER_ALIASES: Record<string, keyof CredentialDraft | "tags"> = {
  label: "label",
  name: "label",
  account: "label",
  title: "label",
  service: "service",
  provider: "service",
  site: "service",
  url: "url",
  loginurl: "url",
  login: "url",
  website: "url",
  username: "username",
  user: "username",
  email: "username",
  accountemail: "username",
  password: "password",
  pass: "password",
  pwd: "password",
  apikey: "apiKey",
  api: "apiKey",
  token: "apiKey",
  apitoken: "apiKey",
  secret: "apiKey",
  category: "category",
  group: "category",
  notes: "notes",
  note: "notes",
  tags: "tags",
};

function cleanHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeUrl(value: string) {
  const text = value.trim();
  if (!text) return "";
  if (/^[a-z]+:\/\//i.test(text)) return text;
  if (/^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(text)) return `https://${text}`;
  return text;
}

function normalizeCategory(value?: string) {
  const trimmed = value?.trim();
  return trimmed || DEFAULT_CATEGORY;
}

function normalizeTags(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const tags = value.map(String).map((tag) => tag.trim()).filter(Boolean);
    return tags.length ? Array.from(new Set(tags)).slice(0, 20) : undefined;
  }
  if (typeof value !== "string") return undefined;
  const tags = value
    .split(/[,;|]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length ? Array.from(new Set(tags)).slice(0, 20) : undefined;
}

function makeDraft(value: Partial<CredentialDraft>, fallbackLabel = ""): CredentialDraft | null {
  const label = String(value.label || fallbackLabel).trim();
  const service = String(value.service || "").trim();
  const username = String(value.username || "").trim();
  const url = normalizeUrl(String(value.url || ""));
  const password = String(value.password || "");
  const apiKey = String(value.apiKey || "");
  const notes = String(value.notes || "").trim();
  const category = normalizeCategory(value.category);
  const tags = normalizeTags(value.tags);

  const resolvedLabel =
    label ||
    service ||
    (url ? url.replace(/^https?:\/\//i, "").split("/")[0] : "") ||
    username;

  if (!resolvedLabel || !(username || password || apiKey || url)) return null;

  return {
    label: resolvedLabel,
    service,
    url,
    username,
    password,
    apiKey,
    notes,
    category,
    createdAt: value.createdAt || todayISO(),
    tags,
  };
}

function dedupe(items: CredentialDraft[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = [
      item.label.trim().toLowerCase(),
      item.service.trim().toLowerCase(),
      item.url.trim().toLowerCase(),
      item.username.trim().toLowerCase(),
      item.password,
      item.apiKey,
    ].join("\u001f");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function splitDelimitedLine(line: string, delimiter: string) {
  const out: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  out.push(current.trim());
  return out;
}

function detectDelimiter(line: string) {
  const candidates = ["\t", ",", ";", "|"];
  let best = "";
  let count = 0;
  for (const delimiter of candidates) {
    const cells = splitDelimitedLine(line, delimiter);
    if (cells.length > count) {
      best = delimiter;
      count = cells.length;
    }
  }
  return count >= 2 ? best : "";
}

function parseDelimited(text: string): CredentialBatchParseResult | null {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 1) return null;

  const delimiter = detectDelimiter(lines[0]);
  if (!delimiter) return null;

  const first = splitDelimitedLine(lines[0], delimiter);
  const mappedHeaders = first.map((header) => HEADER_ALIASES[cleanHeader(header)] || null);
  const headerHits = mappedHeaders.filter(Boolean).length;

  // Header-based CSV/TSV/spreadsheet paste.
  if (headerHits >= 2 && lines.length > 1) {
    const items: CredentialDraft[] = [];
    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = splitDelimitedLine(lines[i], delimiter);
      const raw: Partial<CredentialDraft> & { tags?: string[] } = {};
      mappedHeaders.forEach((field, index) => {
        if (!field) return;
        const value = cells[index] ?? "";
        if (field === "tags") raw.tags = normalizeTags(value);
        else (raw as Record<string, unknown>)[field] = value;
      });
      const item = makeDraft(raw);
      if (item) items.push(item);
      else errors.push(`Row ${i + 1}: missing a usable label/service and credential value.`);
    }
    return { items: dedupe(items), errors, format: "delimited" };
  }

  // Headerless quick rows: Label | Service | URL | Username | Password | API Key | Category | Notes
  const items: CredentialDraft[] = [];
  const errors: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cells = splitDelimitedLine(lines[i], delimiter);
    if (cells.length < 2) continue;
    const item = makeDraft({
      label: cells[0] || "",
      service: cells[1] || "",
      url: cells[2] || "",
      username: cells[3] || "",
      password: cells[4] || "",
      apiKey: cells[5] || "",
      category: cells[6] || DEFAULT_CATEGORY,
      notes: cells.slice(7).join(" | "),
    });
    if (item) items.push(item);
    else errors.push(`Row ${i + 1}: could not create a credential.`);
  }
  if (!items.length) return null;
  return { items: dedupe(items), errors, format: "lines" };
}

function parseKeyValue(text: string): CredentialBatchParseResult | null {
  const blocks = text
    .split(/\n\s*\n|\n\s*---+\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  const items: CredentialDraft[] = [];
  const errors: string[] = [];
  let recognizedPairs = 0;

  blocks.forEach((block, blockIndex) => {
    const raw: Record<string, unknown> = {};
    const noteLines: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      const match = line.match(/^\s*([^:=]{2,32})\s*[:=]\s*(.*)$/);
      if (!match) {
        if (line.trim()) noteLines.push(line.trim());
        continue;
      }
      const field = HEADER_ALIASES[cleanHeader(match[1])];
      if (!field) {
        noteLines.push(line.trim());
        continue;
      }
      recognizedPairs++;
      if (field === "tags") raw.tags = normalizeTags(match[2]);
      else raw[field] = match[2];
    }
    if (noteLines.length && !raw.notes) raw.notes = noteLines.join("\n");
    const item = makeDraft(raw as Partial<CredentialDraft>);
    if (item) items.push(item);
    else if (recognizedPairs) errors.push(`Block ${blockIndex + 1}: incomplete credential.`);
  });

  if (!recognizedPairs || !items.length) return null;
  return { items: dedupe(items), errors, format: "key-value" };
}

function parseJson(text: string): CredentialBatchParseResult | null {
  const trimmed = text.trim();
  if (!(trimmed.startsWith("[") || trimmed.startsWith("{"))) return null;
  try {
    const parsed = JSON.parse(trimmed);
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.credentials) ? parsed.credentials : [parsed];
    const items = rows
      .map((row: unknown) => (row && typeof row === "object" ? makeDraft(row as Partial<CredentialDraft>) : null))
      .filter((item: CredentialDraft | null): item is CredentialDraft => Boolean(item));
    return items.length
      ? { items: dedupe(items), errors: [], format: "json" }
      : { items: [], errors: ["JSON was valid but contained no usable credentials."], format: "json" };
  } catch {
    return null;
  }
}

export function parseCredentialBatch(text: string): CredentialBatchParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { items: [], errors: [], format: "empty" };

  const hosting = parseCredentialsDump(trimmed);
  if (hosting) {
    const credentialGroup = hosting.find((group) => group.target === "credentials");
    if (credentialGroup?.items?.length) {
      const items = credentialGroup.items
        .map((item) => makeDraft(item as Partial<CredentialDraft>))
        .filter((item): item is CredentialDraft => Boolean(item));
      return { items: dedupe(items), errors: [], format: "hosting-dump" };
    }
  }

  return (
    parseJson(trimmed) ||
    parseDelimited(trimmed) ||
    parseKeyValue(trimmed) || {
      items: [],
      errors: [
        "No credentials detected. Use CSV/TSV headers, key: value blocks, JSON, or pipe-separated rows.",
      ],
      format: "empty",
    }
  );
}
