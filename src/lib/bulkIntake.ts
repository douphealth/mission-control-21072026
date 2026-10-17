import { organizePromptBatch } from "./promptOrganization";
import Papa from "papaparse";
import { looksLikeCredentialPairs, parseCredentialBatch as legacyCredentials } from "./credentialBulk";
import { normalizeLibraryRecord } from "./libraryIntake";
import { splitPromptCollection, type PromptSplitRule } from "./promptSplit";

export type BulkMode = "credentials" | "links" | "prompts";
export type IntakeRow = Record<string, unknown>;
export type IntakeOptions = { delimiter?: string; hasHeader?: boolean; columns?: string[]; splitRule?: PromptSplitRule; layout?: "auto" | "prompt-pairs" | "prompt-cells" };
export type IntakeTable = { headers: string[]; columns: string[]; delimiter: string; hasHeader: boolean; needsReview: boolean; suspectedDataHeader: boolean };
export type IntakeIssue = { line: number; message: string };
export type BulkPreview = { rows: IntakeRow[]; issues: IntakeIssue[]; warnings: string[]; fatal: boolean; table?: IntakeTable; splitMethod?: string; sourceLines?: number[]; needsSecretReview?: boolean };
export const INTAKE_LIMIT = 1000;
export const INTAKE_BYTES = 1_000_000;
export const IGNORE = "__ignore__";
export const PRIVATE = "__private__";
export const EXTRA = "__extra__";
export const CREDENTIAL_CATEGORIES = ["General", "Infrastructure", "Hosting", "Development", "Payments", "Social", "Email", "Analytics", "AI Tools", "Security", "Other"];
export const CREDENTIAL_FIELDS = [["label", "Account label"], ["service", "Service"], ["url", "Login URL"], ["username", "Username / email"], ["password", "Password (encrypted)"], ["apiKey", "API / license key (encrypted)"], ["category", "Category"], ["notes", "Notes"], ["tags", "Tags"], [EXTRA, "Date / extra metadata"], [IGNORE, "Ignore column"]] as const;
export const LINK_FIELDS = [["title", "Title / program"], ["url", "Link / affiliate URL"], ["kind", "Link type"], ["category", "Category"], ["merchant", "Merchant"], ["network", "Affiliate network"], ["website", "Website / brand"], ["campaign", "Campaign"], ["trackingId", "Tracking ID"], ["description", "Description / notes"], ["tags", "Tags"], ["commissionNotes", "Commission notes"], ["disclosure", "Disclosure"], ["vertical", "Industry group"], ["linkType", "Affiliate relationship type"], ["strategyStatus", "Strategy status (reported)"], ["verdict", "Review verdict (reported)"], ["httpStatus", "HTTP status (reported)"], ["finalUrl", "Final URL (reported)"], ["trackingEvidence", "Tracking evidence (reported)"], ["affiliateDashboard", "Affiliate dashboard URL"], [EXTRA, "Extra metadata in notes"], [IGNORE, "Ignore column"]] as const;
export const PROMPT_FIELDS = [["title", "Title"], ["content", "Prompt content"], ["category", "Category"], ["model", "Model / platform"], ["tags", "Tags"], [IGNORE, "Ignore column"]] as const;
const str = (v: unknown): string => typeof v === "string" ? v : v == null ? "" : String(v);
const key = (v: string) => v.replace(/^\uFEFF/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const own = (map: Record<string, string>, k: string): string | undefined => Object.hasOwn(map, k) ? map[k] : undefined;
const dateCell = (v: string) => /^(?:\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2})(?:[ T].*)?$/.test(v.trim());
const emailCell = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());
function webCell(v: string) {
  const value = v.trim();
  if (!value || /\s/.test(value) || emailCell(value) || dateCell(value)) return false;
  try { const u = new URL(/^[a-z][\w+.-]*:/i.test(value) ? value : `https://${value}`); return /^https?:$/.test(u.protocol) && !u.username && !u.password && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i.test(u.hostname); } catch { return false; }
}
const secretColumnLabel = (v: string) => /\b(?:api\s*(?:key|token|secret)|access\s*token|auth\s*token|client\s*secret|private\s*key|license\s*key)\b/i.test(v);
const opaqueCell = (v: string) => !webCell(v) && !emailCell(v) && !dateCell(v) && v.trim().length >= 24 && !/\s/.test(v.trim()) && /[a-z]/i.test(v) && /\d/.test(v) && /^[a-z\d_+./=:-]+$/i.test(v.trim());
const likelyHeaderData = (v: string) => emailCell(v) || dateCell(v) || opaqueCell(v);

const common: Record<string, string> = { title: "title", name: "title", category: "category", tags: "tags", tag: "tags", status: "status", pinned: "pinned", favorite: "pinned", createdat: "createdAt", updatedat: "updatedAt", dateadded: "dateAdded", color: "color" };
const links: Record<string, string> = {
  program: "title", programname: "title", tool: "title", service: "title", product: "title", name: "title", account: "title", accountname: "title", accountlabel: "title", label: "title", url: "url", link: "url", affiliateurl: "url", affiliatelink: "url", affiliatereferrallink: "url", affiliatereferralurl: "url", referralurl: "url", referrallink: "url", partnerurl: "url", partnerlink: "url", destinationurl: "url", trackingurl: "url", kind: "kind", type: "kind", linktype: "kind", merchant: "merchant", brand: "merchant", network: "network", affiliatenetwork: "network", affiliateprogram: "network", programnetwork: "network", website: "website", websites: "website", sitename: "website", brandwebsite: "website", campaign: "campaign", campaignname: "campaign", trackingid: "trackingId", affiliateid: "trackingId", commission: "commissionNotes", commissionnotes: "commissionNotes", disclosure: "disclosure", disclosurenotes: "disclosure", notes: "description", note: "description", description: "description", finalurl: "finalUrl", affiliatedashboard: "affiliateDashboard", dashboard: "affiliateDashboard", strategystatus: "strategyStatus", verdict: "verdict", http: "httpStatus", httpstatus: "httpStatus", trackingevidence: "trackingEvidence", vertical: "vertical", industry: "vertical", linkvertical: "vertical", relationshiptype: "linkType",
};
const prompts: Record<string, string> = { prompt: "content", aiprompt: "content", prompttext: "content", promptcontent: "content", content: "content", body: "content", text: "content", instructions: "content", prompttitle: "title", promptname: "title", heading: "title", headingcell: "title", promptheading: "title", templatename: "title", actualprompt: "content", instruction: "content", promptbody: "content", template: "content", model: "model", platform: "model", kind: IGNORE, variables: IGNORE, id: IGNORE };
const credentials: Record<string, string> = {
  label: "label", name: "label", account: "label", accountname: "label", accountlabel: "label", title: "label", program: "label", tool: "label", service: "service", provider: "service", platform: "service", application: "service", product: "service", site: "service", url: "url", loginurl: "url", websiteurl: "url", dashboardurl: "url", login: "url", website: "url", dashboard: "url", username: "username", user: "username", userid: "username", email: "username", accountemail: "username", loginemail: "username", password: "password", loginpassword: "password", pass: "password", pwd: "password", passwd: "password", apikey: "apiKey", api: "apiKey", apitoken: "apiKey", token: "apiKey", accesstoken: "apiKey", authtoken: "apiKey", bearertoken: "apiKey", personaltoken: "apiKey", personalaccesstoken: "apiKey", pat: "apiKey", secret: "apiKey", secretkey: "apiKey", apisecret: "apiKey", clientsecret: "apiKey", privatetoken: "apiKey", servicerolekey: "apiKey", anonkey: "apiKey", licensekey: "apiKey", productkey: "apiKey", category: "category", group: "category", description: "notes", comments: "notes", notes: "notes", note: "notes", tags: "tags", date: EXTRA, dateadded: EXTRA, purchasedate: EXTRA, renewaldate: EXTRA, expirydate: EXTRA, expires: EXTRA, lastupdated: EXTRA, createdat: "createdAt",
};
function field(mode: BulkMode, header: string): string {
  const k = key(header);
  const localized: Record<string, string> = { "τιτλος": mode === "credentials" ? "label" : "title", "ονομα": mode === "credentials" ? "label" : "title", "κατηγορια": "category", "οδηγιες": mode === "prompts" ? "content" : mode === "links" ? "description" : "notes", "κωδικος": mode === "credentials" ? "password" : PRIVATE };
  if (own(localized, k)) return localized[k];
  if (mode === "credentials") {
    const known = own(credentials, k);
    if (known) return known;
    if (header.length <= 80 && secretColumnLabel(header)) return "apiKey";
    return IGNORE;
  }
  if (mode === "links" && /(?:password|passphrase|secret|apikey|apitoken|accesstoken|bearertoken|username|userid|email|licensekey|productkey|recoverycode)|^(?:pass|pwd|key|token|login)$/.test(k)) return PRIVATE;
  return own(mode === "links" ? links : prompts, k) || own(common, k) || IGNORE;
}
type SourceRow = { cells: string[]; line: number };
function inferColumns(mode: BulkMode, rows: SourceRow[], width: number): string[] {
  const columns: string[] = Array(width).fill(IGNORE);
  if (mode === "prompts") {
    const populated = Array.from({ length: width }, (_, i) => i).filter(i => rows.some(row => row.cells[i]?.trim()));
    if (populated.length >= 2) {
      const [a, b] = populated;
      const avg = (i: number) => rows.slice(0, 100).reduce((n, row) => n + (row.cells[i]?.trim().length || 0), 0) / Math.max(1, Math.min(100, rows.length));
      const reverse = avg(a) > Math.max(160, avg(b) * 3) && avg(b) < 120;
      columns[reverse ? a : b] = "content"; columns[reverse ? b : a] = "title";
    }
    return columns;
  }
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
        const known = cells.filter(cell => field(mode, cell) !== IGNORE).length;
        const score = cells.length > 1 && (known >= 2 || candidate === "|" || cells.some(webCell)) ? known * 100 + cells.length : 0;
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
  if (mode === "prompts" && options.layout === "prompt-cells") return { table: { headers: ["Prompt content"], columns: ["content"], delimiter, hasHeader: false, suspectedDataHeader: false, needsReview: true }, data: data.flatMap(row => row.cells.filter(cell => cell.trim()).map(cell => ({ cells: [cell], line: row.line }))), issues };
  const firstFields = data[0].cells.map(cell => field(mode, cell));
  const realFields = firstFields.filter(f => ![IGNORE, PRIVATE, EXTRA].includes(f));
  const firstRowHasData = data[0].cells.some(v => webCell(v) || likelyHeaderData(v)) || (mode === "credentials" && data[0].cells.some(v => emailCell(v) || dateCell(v)));
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
/**
 * Google Sheets sometimes puts a heading in one spreadsheet row and its prompt in the
 * next row (the other column). Join only unambiguous adjacent complements; never
 * split prompt bodies, infer a new heading from numbered instructions, or discard text.
 */
function pairAdjacentPromptRows(data: SourceRow[], columns: string[]): { data: SourceRow[]; paired: number } {
  const title = columns.indexOf("title"), body = columns.indexOf("content");
  if (title < 0 || body < 0) return { data, paired: 0 };
  const pairedRows: SourceRow[] = [];
  let paired = 0;
  for (let i = 0; i < data.length; i++) {
    const first = data[i], second = data[i + 1];
    const titleOnly = !!first.cells[title]?.trim() && !first.cells[body]?.trim();
    const bodyOnly = !!second?.cells[body]?.trim() && !second.cells[title]?.trim();
    // Do not silently discard populated category/model/other spreadsheet columns.
    const safeToJoin = second && second.cells.every((value, index) => !value.trim() || index === body || !first.cells[index]?.trim());
    if (titleOnly && bodyOnly && safeToJoin) {
      const cells = Array.from({ length: Math.max(first.cells.length, second.cells.length) }, (_, index) =>
        first.cells[index] || second.cells[index] || "");
      pairedRows.push({ cells, line: first.line });
      i++; paired++; continue;
    }
    pairedRows.push(first);
  }
  return { data: pairedRows, paired };
}

function mappedRecord(mode: BulkMode, cells: unknown[], headers: string[], columns: string[]) {
  const out: IntakeRow = {};
  const notesField = mode === "credentials" ? "notes" : "description";
  for (const [i, f] of columns.entries()) {
    const value = cells[i]; if (value == null || value === "" || f === IGNORE || f === PRIVATE) continue;
    if (mode === "credentials" && (f === "password" || f === "apiKey") && Object.hasOwn(out, f) && str(out[f]) !== str(value)) {
      const extras = (out.__extraSecrets || []) as Array<{ field: string; value: string; column: number }>;
      extras.push({ field: f, value: str(value), column: i + 1 }); out.__extraSecrets = extras;
    } else if (f === EXTRA || f === notesField) {
      out[notesField] = [out[notesField], f === EXTRA ? `${headers[i]}: ${str(value)}` : str(value)].filter(Boolean).join("\n");
    } else if (f === "kind") {
      if (/affiliate|referral|ambassador|partner/i.test(str(value))) out.kind = "affiliate";
      else if (/^standard$/i.test(str(value))) out.kind = "standard";
      if (!/^(standard|affiliate)$/i.test(str(value))) out.linkType = str(value);
    } else if (Object.hasOwn(out, f) && str(out[f]) !== str(value)) throw new Error("Multiple columns target one field. Correct the column mapping.");
    else out[f] = value;
  }
  if (mode === "credentials") {
    const extras = (out.__extraSecrets || []) as Array<{ field: string; value: string; column: number }>;
    const seen = new Set([str(out.apiKey), str(out.password), ...extras.map(extra => extra.value)]);
    for (let i = 0; i < cells.length; i++) {
      if (columns[i] !== IGNORE) continue;
      const value = str(cells[i]), labelled = i > 0 && secretColumnLabel(str(cells[i - 1]));
      if (!value.trim() || seen.has(value) || webCell(value) || emailCell(value) || dateCell(value)) continue;
      if (labelled && value.trim().length >= 8 || opaqueCell(value)) {
        if (!out.apiKey) out.apiKey = value; else extras.push({ field: "apiKey", value, column: i + 1 });
        seen.add(value); out.__reviewInferredSecret = true;
      }
    }
    if (extras.length) { out.__extraSecrets = extras; out.__reviewInferredSecret = true; }
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
  const result = legacyCredentials(JSON.stringify([{ ...row, __reviewInferredSecret: undefined, __extraSecrets: undefined }]));
  if (!result.items.length) throw new Error("No account, URL, password or key in the mapped fields. Correct the mapping or leave this row out.");
  return { ...result.items[0], ...(row.__reviewInferredSecret ? { __reviewInferredSecret: true } : {}) } as IntakeRow;
}

/** Pure, local preview. No network calls, logging, storage writes or secret-valued errors. */
export function previewBulkIntake(mode: BulkMode, input: string, options: IntakeOptions = {}): BulkPreview {
  const result: BulkPreview = { rows: [], issues: [], warnings: [], fatal: false, sourceLines: [] };
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
      // Field/value spreadsheet blocks are not conventional column tables. Routing
      // through the dedicated parser retains one encrypted vault entry per account.
      if (mode === "credentials" && looksLikeCredentialPairs(input)) {
        const credentials = legacyCredentials(input);
        result.rows = credentials.items as unknown as IntakeRow[];
        result.issues = credentials.errors.map((message, index) => ({ line: index + 1, message }));
        result.needsSecretReview = true;
        result.warnings.push("Detected vertical credential field/value blocks. Review each account and secret before saving.");
        return result;
      }
      const table = readTable(mode, input, options);
      const acceptedTable = table !== null;
      if (acceptedTable && table) {
        result.table = table.table;
        if (table.issues.length) return { ...result, issues: table.issues, fatal: true };
        if (table.table.suspectedDataHeader) result.warnings.push("The first row looks like credential or link data, not headings. Choose 'Use first row as data' to keep that record and remap automatically. Saving is blocked until corrected.");
        if (table.table.needsReview) result.warnings.push("Review the suggested column mapping, including ignored columns. Empty cells retain their positions. Never map an unknown secret into plain-text notes.");
        if (table.table.columns.includes(PRIVATE)) result.warnings.push("Recognized password, key and account columns are excluded from Links Hub. Store them in Credentials instead.");
        if (mode === "credentials" && table.table.columns.includes(EXTRA)) result.warnings.push("Dates are retained as notes, not used as categories.");
        const promptRows = mode === "prompts" && options.layout !== "prompt-cells"
          ? pairAdjacentPromptRows(table.data, table.table.columns)
          : { data: table.data, paired: 0 };
        if (promptRows.paired) {
          result.splitMethod = "paired spreadsheet rows";
          result.warnings.push(`Combined ${promptRows.paired} heading/body pairs from adjacent spreadsheet rows. Review boundaries before saving.`);
        }
        for (const { cells, line } of promptRows.data) {
          if (table.table.hasHeader && cells.length === table.table.headers.length && cells.every((cell, i) => key(cell) === key(table.table.headers[i]))) continue;
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
      try {
        const parsed = normalize(mode, row);
        if (mode === "credentials" && parsed.__reviewInferredSecret) {
          result.warnings.push("Additional secrets are preserved in encrypted fields. Multiple values become separate labelled vault entries, never plain-text notes. Review the proposed entries.");
          result.needsSecretReview = true; delete parsed.__reviewInferredSecret;
        }
        result.rows.push(parsed); result.sourceLines!.push(line);
        if (mode === "credentials" && row && typeof row === "object") {
          const extras = (row as IntakeRow).__extraSecrets as Array<{ field: string; value: string; column: number }> | undefined;
          for (const extra of extras || []) { result.rows.push({ ...parsed, label: `${parsed.label} - ${extra.field === "password" ? "password" : "key"} (column ${extra.column})`, password: "", apiKey: "", [extra.field]: extra.value }); result.sourceLines!.push(line); }
        }
      } catch (error) { result.issues.push({ line, message: error instanceof Error ? error.message : "Invalid entry; correct the input." }); }
    }
    if (result.rows.length > INTAKE_LIMIT) return fail("The expanded import exceeds 1,000 entries. Split the input; nothing was saved.");
  } catch { return fail("Input structure could not be read. Check JSON, quotes and delimiters. No rows were saved."); }
  if (mode === "prompts") result.rows = organizePromptBatch(result.rows);
  result.warnings = [...new Set(result.warnings)];
  return result;
}
