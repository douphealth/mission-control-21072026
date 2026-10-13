import Papa from "papaparse";
import { parseCredentialBatch as legacyCredentials } from "./credentialBulk";
import { normalizeLibraryRecord } from "./libraryIntake";
import { splitPromptCollection, type PromptSplitRule } from "./promptSplit";

export type BulkMode = "credentials" | "links" | "prompts";
export type IntakeRow = Record<string, unknown>;
export type IntakeOptions = { delimiter?: string; hasHeader?: boolean; columns?: string[]; splitRule?: PromptSplitRule };
export type IntakeTable = { headers: string[]; columns: string[]; delimiter: string; hasHeader: boolean; needsReview: boolean; suspectedDataHeader: boolean };
export type IntakeIssue = { line: number; message: string };
export type BulkPreview = { rows: IntakeRow[]; issues: IntakeIssue[]; warnings: string[]; fatal: boolean; table?: IntakeTable; splitMethod?: string };
export const INTAKE_LIMIT = 1000;
export const INTAKE_BYTES = 1_000_000;
export const IGNORE = "__ignore__";
export const PRIVATE = "__private__";
export const EXTRA = "__extra__";
export const CREDENTIAL_CATEGORIES = ["General", "Infrastructure", "Hosting", "Development", "Payments", "Social", "Email", "Analytics", "AI Tools", "Security", "Other"];
export const CREDENTIAL_FIELDS = [["label", "Account label"], ["service", "Service"], ["url", "Login URL"], ["username", "Username / email"], ["password", "Password (encrypted)"], ["apiKey", "API / license key (encrypted)"], ["category", "Category"], ["notes", "Notes"], ["tags", "Tags"], [EXTRA, "Date / extra metadata"], [IGNORE, "Ignore column"]] as const;
export const LINK_FIELDS = [["title", "Title / program"], ["url", "Link / affiliate URL"], ["kind", "Link type"], ["category", "Category"], ["merchant", "Merchant"], ["network", "Affiliate network"], ["website", "Website / brand"], ["campaign", "Campaign"], ["trackingId", "Tracking ID"], ["description", "Description / notes"], ["tags", "Tags"], ["commissionNotes", "Commission notes"], ["disclosure", "Disclosure"], [EXTRA, "Extra metadata in notes"], [IGNORE, "Ignore column"]] as const;
export const PROMPT_FIELDS = [["title", "Title"], ["content", "Prompt content"], ["category", "Category"], ["model", "Model / platform"], ["tags", "Tags"], [IGNORE, "Ignore column"]] as const;
const str = (v: unknown): string => typeof v === "string" ? v : v == null ? "" : String(v);
const key = (v: string) => v.replace(/^\uFEFF/, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const own = (map: Record<string, string>, k: string): string | undefined => Object.hasOwn(map, k) ? map[k] : undefined;
const dateCell = (v: string) => /^(?:\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2})(?:[ T].*)?$/.test(v.trim());
const emailCell = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());
function webCell(v: string) {
  if (!v.trim() || /\s/.test(v.trim())) return false;
  try { const u = new URL(/^[a-z][\w+.-]*:/i.test(v.trim()) ? v.trim() : `https://${v.trim()}`); return /^https?:$/.test(u.protocol) && !u.username && !u.password && u.hostname.includes("."); } catch { return false; }
}
const secretColumnLabel = (v: string) => /\b(?:api\s*(?:key|token|secret)|access\s*token|auth\s*token|client\s*secret|private\s*key|license\s*key)\b/i.test(v);
const opaqueCell = (v: string) => v.trim().length >= 24 && !/\s/.test(v.trim()) && /[a-z]/i.test(v) && /\d/.test(v) && /^[a-z\d_+./=:-]+$/i.test(v.trim());
const likelyHeaderData = (v: string) => emailCell(v) || dateCell(v) || opaqueCell(v);

const common: Record<string, string> = { title: "title", name: "title", category: "category", tags: "tags", tag: "tags", status: "status", pinned: "pinned", favorite: "pinned", createdat: "createdAt", updatedat: "updatedAt", dateadded: "dateAdded", color: "color" };
const links: Record<string, string> = {
  program: "title", programname: "title", tool: "title", service: "title", product: "title", url: "url", link: "url", affiliateurl: "url", affiliatelink: "url", referralurl: "url", referrallink: "url", affiliatereferrallink: "url", affiliatereferralurl: "url", partnerlink: "url", destinationurl: "url", trackingurl: "url", kind: "kind", type: "kind", linktype: "kind", merchant: "merchant", brand: "merchant", network: "network", affiliatenetwork: "network", website: "website", websites: "website", campaign: "campaign", trackingid: "trackingId", commission: "commissionNotes", commissionnotes: "commissionNotes", disclosure: "disclosure", disclosurenotes: "disclosure", notes: "description", note: "description", description: "description", finalurl: EXTRA, affiliatedashboard: EXTRA, dashboard: EXTRA, strategystatus: EXTRA, verdict: EXTRA, http: EXTRA, trackingevidence: EXTRA,
};
const prompts: Record<string, string> = { prompt: "content", aiprompt: "content", prompttext: "content", promptcontent: "content", content: "content", body: "content", text: "content", instructions: "content", prompttitle: "title", promptname: "title", model: "model", platform: "model", kind: IGNORE, variables: IGNORE, id: IGNORE };
const credentials: Record<string, string> = {
  label: "label", name: "label", account: "label", accountname: "label", accountlabel: "label", title: "label", program: "label", tool: "label", service: "service", provider: "service", platform: "service", application: "service", product: "service", site: "service", url: "url", loginurl: "url", websiteurl: "url", dashboardurl: "url", login: "url", website: "url", dashboard: "url", username: "username", user: "username", userid: "username", email: "username", accountemail: "username", loginemail: "username", password: "password", loginpassword: "password", pass: "password", pwd: "password", passwd: "password", apikey: "apiKey", api: "apiKey", apitoken: "apiKey", token: "apiKey", accesstoken: "apiKey", authtoken: "apiKey", bearertoken: "apiKey", personaltoken: "apiKey", personalaccesstoken: "apiKey", pat: "apiKey", secret: "apiKey", secretkey: "apiKey", apisecret: "apiKey", clientsecret: "apiKey", privatetoken: "apiKey", servicerolekey: "apiKey", anonkey: "apiKey", licensekey: "apiKey", productkey: "apiKey", category: "category", group: "category", description: "notes", comments: "notes", notes: "notes", note: "notes", tags: "tags", date: EXTRA, dateadded: EXTRA, purchasedate: EXTRA, renewaldate: EXTRA, expirydate: EXTRA, expires: EXTRA, lastupdated: EXTRA, createdat: "createdAt",
};
function field(mode: BulkMode, header: string): string {
  const k = key(header);
  if (mode === "credentials") return own(credentials, k) || IGNORE;
  if (mode === "links" && /(?:password|passphrase|secret|apikey|apitoken|accesstoken|bearertoken|username|userid|email|licensekey|productkey|recoverycode)|^(?:pass|pwd|key|token|login)$/.test(k)) return PRIVATE;
  return own(mode === "links" ? links : prompts, k) || own(common, k) || IGNORE;
}
type SourceRow = { cells: string[]; line: number };
function inferColumns(mode: BulkMode, rows: SourceRow[], width: number): string[] {
  const columns: string[] = Array(width).fill(IGNORE);
  const ratio = (i: number, test: (s: string) => boolean) => { const values = rows.slice(0, 100).map(r => r.cells[i] || "").filter(v => v.trim()); return values.length ? values.filter(test).length / values.length : 0; };
  for (let i = 0; i < width; i++) {
    if (ratio(i, webCell) >= .6 && !columns.includes("url")) columns[i] = "url";
    else if (mode === "credentials") {
      if (ratio(i, dateCell) >= .6) columns[i] = EXTRA;
      else if (ratio(i, emailCell) >= .6 && !columns.includes("username")) columns[i] = "username";
      else if (ratio(i, v => CREDENTIAL_CATEGORIES.some(c => c.toLowerCase() === v.trim().toLowerCase())) >= .6) columns[i] = "category";
    }
  }
  const set = (i: number, value: string) => { if (i >= 0 && i < width && columns[i] === IGNORE) columns[i] = value; };
  const u = columns.indexOf("url");
  if (mode === "links") { if (u > 0) set(0, "title"); return columns; }
  if (mode === "credentials") {
    set(0, "label"); if (u >= 2) set(1, "service");
    if (!columns.includes("username") && u >= 0 && ratio(u + 1, emailCell) >= .6) set(u + 1, "username");
    const account = columns.indexOf("username");
    // Headerless dumps often put descriptive labels after the email, NOT a password.
    // Never auto-assign natural-language cells to password or unencrypted notes.
    if (account >= 0 && !columns.includes("password") && ratio(account + 1, value =>
      !!value.trim() && !/\s/.test(value.trim()) && !webCell(value) && !emailCell(value) && !dateCell(value)) >= .6) set(account + 1, "password");
    // Only a dedicated key label paired with a token is evidence for a key column.
    for (let i = 1; i < width; i++) {
      if (!columns.includes("apiKey") && ratio(i - 1, secretColumnLabel) >= .65 && ratio(i, value =>
        value.trim().length >= 8 && !/\s/.test(value.trim()) && !webCell(value) && !emailCell(value) && !dateCell(value)) >= .65) set(i, "apiKey");
    }
    // Preserve the established reviewable 8-column date-then-note convention.
    if (u === 2 && width >= 8 && [EXTRA, "category"].includes(columns[6]) &&
      ratio(7, v => /\s/.test(v.trim()) && v.trim().length <= 250 && !secretColumnLabel(v)) >= .6) set(7, "notes");
    // Other unknown columns are never guessed into unencrypted notes.
  }
  return columns;
}
function readTable(mode: BulkMode, input: string, options: IntakeOptions): { table: IntakeTable; data: SourceRow[]; issues: IntakeIssue[] } | null {
  const source = input.replace(/^\uFEFF/, "");
  const first = source.split(/\r\n|\r|\n/).find(line => line.trim()) || "";
  let delimiter = options.delimiter || "";
  if (!delimiter && !first.includes("\t") && (webCell(first) || /^\[[^\]]+\]\(https?:\/\//i.test(first.trim()))) return null;
  if (!delimiter) {
    if (first.includes("\t")) delimiter = "\t";
    else {
      let best = 0;
      for (const candidate of [",", ";", "|"]) {
        const cells = Papa.parse<string[]>(first, { delimiter: candidate, header: false }).data[0] || [];
        const score = cells.length > 1 ? cells.filter(cell => field(mode, cell) !== IGNORE).length * 100 + cells.length : 0;
        if (score > best) { best = score; delimiter = candidate; }
      }
    }
  }
  if (!delimiter || !["\t", ",", ";", "|"].includes(delimiter)) return null;
  const data: SourceRow[] = [], issues: IntakeIssue[] = [];
  let cursor = 0, line = 1;
  const markdown = delimiter === "|" && first.trim().startsWith("|");
  Papa.parse<string[]>(source, { delimiter, header: false, dynamicTyping: false, skipEmptyLines: false, step(result, parser) {
    if (result.errors.length) issues.push({ line, message: "Malformed quoted cells. Close quoted fields or choose the correct delimiter before saving." });
    let cells = result.data;
    if (markdown) { if (!cells[0]?.trim()) cells = cells.slice(1); if (!cells.at(-1)?.trim()) cells = cells.slice(0, -1); }
    if (delimiter === "|") cells = cells.map(cell => cell.trim());
    if (cells.some(cell => cell.trim()) && !(markdown && cells.every(cell => /^\s*:?-{3,}:?\s*$/.test(cell)))) data.push({ cells, line });
    line += (source.slice(cursor, result.meta.cursor).match(/\r\n|\r|\n/g) || []).length;
    cursor = result.meta.cursor;
    if (data.length > INTAKE_LIMIT + 1 || cells.length > 100) { issues.push({ line, message: "Import at most 1,000 rows and 100 columns at a time." }); parser.abort(); }
  }});
  if (!data.length) return null;
  const firstFields = data[0].cells.map(cell => field(mode, cell));
  const realFields = firstFields.filter(f => ![IGNORE, PRIVATE, EXTRA].includes(f));
  const firstRowHasData = data[0].cells.some(v => webCell(v) || likelyHeaderData(v));
  // Data must not be treated as eleven column headings and the first key lost.
  const headerLikely = !firstRowHasData && new Set(realFields).size >= 2;
  const hasHeader = options.hasHeader ?? headerLikely;
  const suspectedDataHeader = hasHeader && (!headerLikely || firstRowHasData);
  const width = Math.min(100, data.reduce((n, r) => Math.max(n, r.cells.length), 0));
  // Mask account emails, URLs and opaque secrets that were mistaken for headings.
  const headers = Array.from({ length: width }, (_, i) => hasHeader && !suspectedDataHeader ? data[0].cells[i]?.trim() || `Column ${i + 1}` : `Column ${i + 1}`);
  const records = hasHeader ? data.slice(1) : data;
  const suggested = hasHeader && !suspectedDataHeader ? headers.map(h => field(mode, h)) : inferColumns(mode, data, width);
  const columns = suggested.map((f, i) => f === PRIVATE ? f : options.columns?.[i] ?? f);
  const permitted = new Set<string>([...(mode === "credentials" ? CREDENTIAL_FIELDS : mode === "links" ? LINK_FIELDS : PROMPT_FIELDS).map(([f]) => f), PRIVATE, "status", "pinned", "createdAt", "updatedAt", "dateAdded", "color"]);
  if (columns.some(f => !permitted.has(f))) issues.push({ line: 0, message: "Unsupported column mapping. Select fields from the mapping controls." });
  if (records.length > INTAKE_LIMIT) issues.push({ line: 0, message: "Import at most 1,000 entries per batch." });
  return { table: { headers, columns, delimiter, hasHeader, suspectedDataHeader, needsReview: suspectedDataHeader || !hasHeader || columns.includes(IGNORE) }, data: records, issues };
}
function mappedRecord(mode: BulkMode, cells: unknown[], headers: string[], columns: string[]) {
  const out: IntakeRow = {};
  const notesField = mode === "credentials" ? "notes" : "description";
  for (const [i, f] of columns.entries()) {
    const value = cells[i]; if (value == null || value === "" || f === IGNORE || f === PRIVATE) continue;
    if (f === EXTRA || f === notesField) {
      out[notesField] = [out[notesField], f === EXTRA ? `${headers[i]}: ${str(value)}` : str(value)].filter(Boolean).join("\n");
    } else if (f === "kind") {
      if (/affiliate|referral|ambassador|partner/i.test(str(value))) out.kind = "affiliate";
      else if (/^standard$/i.test(str(value))) out.kind = "standard";
      if (!/^(standard|affiliate)$/i.test(str(value))) out.description = [out.description, `Type: ${str(value)}`].filter(Boolean).join("\n");
    } else if (Object.hasOwn(out, f) && str(out[f]) !== str(value)) throw new Error("Multiple columns target one field. Correct the column mapping.");
    else out[f] = value;
  }
  if (mode === "credentials") {
    // Headerless dumps may include dedicated API-key labels in later columns.
    // Encrypt per-row labelled keys rather than exposing them as plain notes.
    for (let i = 1; i < cells.length; i++) {
      if (columns[i] !== IGNORE || !secretColumnLabel(str(cells[i - 1]))) continue;
      const value = str(cells[i]);
      if (!value.trim() || webCell(value) || emailCell(value) || dateCell(value) || value.trim().length < 8) continue;
      if (out.apiKey && out.apiKey !== value) throw new Error("More than one API key was found in this row. Split the credentials or map the keys separately.");
      out.apiKey = value;
    }
    for (let i = 0; i < cells.length; i++) {
      if (columns[i] === IGNORE && opaqueCell(str(cells[i])) && str(out.apiKey) !== str(cells[i]))
        throw new Error(`Column ${i + 1} contains an unmapped token-like value. Map it to Password or API Key before saving.`);
    }
  }
  return out;
}
function normalize(mode: BulkMode, value: unknown): IntakeRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Provide a record with named fields.");
  const row = { ...value } as IntakeRow;
  if (mode !== "credentials") {
    if (mode === "links" && /^(?:n\/?a|none|null|missing|pending|-|retrieve from dashboard)?$/i.test(str(row.url).trim())) throw new Error("The actual link is empty or pending. Add the referral/link URL; a dashboard or final URL is not substituted.");
    return normalizeLibraryRecord(mode, row) as IntakeRow;
  }
  if (dateCell(str(row.category))) { row.notes = [row.notes, `Imported date: ${str(row.category)}`].filter(Boolean).join("\n"); row.category = "General"; }
  const result = legacyCredentials(JSON.stringify([row]));
  if (!result.items.length) throw new Error("No account, URL, password or key in the mapped fields. Correct the mapping or leave this row out.");
  return result.items[0] as unknown as IntakeRow;
}

/** Pure, local preview. No network calls, logging, storage writes or secret-valued errors. */
export function previewBulkIntake(mode: BulkMode, input: string, options: IntakeOptions = {}): BulkPreview {
  const result: BulkPreview = { rows: [], issues: [], warnings: [], fatal: false };
  const fail = (message: string) => ({ ...result, rows: [], issues: [{ line: 0, message }], fatal: true });
  if (!input.trim()) return result;
  if (input.length > INTAKE_BYTES || new TextEncoder().encode(input).byteLength > INTAKE_BYTES) return fail("Paste or upload at most 1 MB at a time.");
  const entries: { row: unknown; line: number }[] = [];
  try {
    if (mode === "prompts" && options.splitRule === "single") { entries.push({ row: { content: input }, line: 1 }); result.splitMethod = "single"; }
    else if (/^(?:\[\s*(?:\{|"|\])|\{\s*")/.test(input.trim())) {
      const json = JSON.parse(input);
      const records: unknown[] = Array.isArray(json) ? json[0] === undefined ? [] : json : json[mode] ?? json.items ?? [json];
      if (!Array.isArray(records) || records.length > INTAKE_LIMIT) return fail("JSON must contain at most 1,000 records.");
      records.forEach((value, i) => {
        if (typeof value === "string" && mode !== "credentials") entries.push({ row: { [mode === "prompts" ? "content" : "url"]: value }, line: i + 1 });
        else if (value && typeof value === "object" && !Array.isArray(value)) {
          const pairs = Object.entries(value); const headers = pairs.map(([h]) => h); const fields = headers.map(h => field(mode, h));
          if (fields.includes(PRIVATE)) result.warnings.push("Recognized password, key and account columns are excluded from Links Hub. Store them in Credentials instead.");
          try { entries.push({ row: mappedRecord(mode, pairs.map(([, v]) => v), headers, fields), line: i + 1 }); }
          catch { result.issues.push({ line: i + 1, message: "Conflicting fields. Use one mapped value for each account, URL or content field." }); }
        } else result.issues.push({ line: i + 1, message: "Provide a record with named fields." });
      });
    } else {
      const table = readTable(mode, input, options);
      const acceptedTable = table && (mode !== "prompts" || table.table.columns.includes("content"));
      if (acceptedTable && table) {
        result.table = table.table;
        if (table.issues.length) return { ...result, issues: table.issues, fatal: true };
        if (table.table.suspectedDataHeader) result.warnings.push("The first row looks like credential or link data, not headings. Choose 'Use first row as data' to keep that record and remap automatically. Saving is blocked until corrected.");
        if (table.table.needsReview) result.warnings.push("Review the suggested column mapping, including ignored columns. Empty cells retain their positions. Never map an unknown secret into plain-text notes.");
        if (table.table.columns.includes(PRIVATE)) result.warnings.push("Recognized password, key and account columns are excluded from Links Hub. Store them in Credentials instead.");
        if (mode === "credentials" && table.table.columns.includes(EXTRA)) result.warnings.push("Dates are retained as notes, not used as categories.");
        for (const { cells, line } of table.data) {
          try { entries.push({ row: mappedRecord(mode, cells, table.table.headers, table.table.columns), line }); }
          catch (error) {
            // Only disclose safe structural diagnostics, never the pasted secrets.
            const message = error instanceof Error ? error.message : "";
            result.issues.push({ line, message: /^Column [0-9]+ contains an unmapped token-like value[.]/.test(message) ||
              message === "More than one API key was found in this row. Split the credentials or map the keys separately."
                ? message : "Multiple columns target one field. Correct the column mapping." });
          }
        }
      } else if (mode === "prompts") {
        const split = splitPromptCollection(input, options.splitRule);
        result.splitMethod = split.method; result.warnings.push(...split.warnings);
        split.parts.forEach((row, i) => entries.push({ row, line: i + 1 }));
      } else if (mode === "credentials") {
        const legacy = legacyCredentials(input);
        if (legacy.items.length > INTAKE_LIMIT) return fail("Import at most 1,000 entries per batch.");
        result.rows = legacy.items as unknown as IntakeRow[];
        result.issues = legacy.errors.map((message, i) => ({ line: i + 1, message }));
        return result;
      } else input.split(/\r\n|\r|\n/).forEach((line, i) => {
        if (!line.trim()) return;
        const markdown = line.trim().match(/^\[([^\]]+)\]\((https?:\/\/.*)\)$/);
        entries.push({ row: markdown ? { title: markdown[1], url: markdown[2] } : { url: line.trim() }, line: i + 1 });
      });
    }
    if (entries.length + result.issues.length > INTAKE_LIMIT) return fail("Import at most 1,000 entries per batch.");
    for (const { row, line } of entries) {
      try { result.rows.push(normalize(mode, row)); }
      catch (error) { result.issues.push({ line, message: error instanceof Error ? error.message : "Invalid entry; correct the input." }); }
    }
  } catch { return fail("Input structure could not be read. Check JSON, quotes and delimiters. No rows were saved."); }
  result.warnings = [...new Set(result.warnings)];
  return result;
}
