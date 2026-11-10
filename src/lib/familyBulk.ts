import Papa from "papaparse";
import type { FamilyRecord } from "./privateVault";
import { fold, parseFreeText, resolveShortNames } from "./familyFreeText";

export const FAMILY_CATEGORIES = ["Identity", "Banking", "Insurance", "Health", "Emergency", "Notes", "Other"];
export const FAMILY_IMPORT_LIMIT = 5000;
export const FAMILY_IMPORT_BYTES = 5 * 1024 * 1024;
export type FamilyPatch = { member?: string; category?: string; notes?: string };

const FAMILY_HEADER: Record<string, string> = Object.fromEntries(Object.entries({
  member: ["member", "name", "fullname", "person", "familymember", "membername", "owner", "who", "holder", "accountholder", "firstname", "relative", "μέλος", "ονομα", "όνομα"],
  label: ["label", "title", "record", "recordname", "item", "document", "documenttype", "field", "description", "account", "bank", "bankname", "institution", "provider", "what"],
  category: ["category", "type", "kind", "group", "section", "κατηγορία"],
  value: ["value", "number", "secret", "id", "idnumber", "iban", "accountnumber", "ssn", "socialnumber", "socialsecuritynumber", "amka", "afm", "taxid", "passportnumber", "data", "details", "info", "code", "τιμή"],
  notes: ["notes", "note", "comments", "comment", "remarks", "extra"],
}).flatMap(([k, list]) => list.map(a => [a.replace(/[^a-z0-9\u0370-\u03ff]/g, ""), k])));

function guessCategory(text: string) {
  const t = fold(text);
  if (/\bgr\d{2}\s?\d{4}/.test(t) || /iban|swift|\bbic\b|bank|card|visa|mastercard|account|τραπεζ|λογαριασ|καρτ|πιστωτ|χρεωστ/.test(t)) return "Banking";
  if (/amka|αμκα|health|doctor|blood|medical|υγει|γιατρ|αιματ|εφκα|\bικα\b/.test(t)) return "Health";
  if (/insur|policy|ασφαλ/.test(t)) return "Insurance";
  if (/emergency|contact|phone|mobile|\btel\b|τηλ|κινητ|εκτακτ|επαφ/.test(t)) return "Emergency";
  if (/passport|ssn|social|\bid\b|identity|tax|afm|licen|birth|\bdob\b|ταυτ|διαβατ|αφμ|αδτ|διπλωμ|γεννησ|ημερομην|προσωπικ|αριθ|μητρω|αστυνομ/.test(t)) return "Identity";
  return "Other";
}

/** CSV only when the first line splits into cells that look like a header or rows share one delimiter. */
function looksLikeCsv(text: string) {
  const lines = text.split(/\r?\n/).filter(l => l.trim()).slice(0, 20);
  if (lines.length < 2) return false;
  return [",", ";", "\t", "|"].some(d => {
    const cells = lines[0].split(d);
    if (cells.length < 2) return false;
    if (cells.some(c => FAMILY_HEADER[c.trim().replace(/^"|"$/g, "").toLowerCase().replace(/[^a-z0-9\u0370-\u03ff]/g, "")])) return true;
    return lines.every(l => l.split(d).length === cells.length) && !/:\s*$/.test(lines[0]);
  });
}

export function validateFamilyRecord(record: FamilyRecord) {
  if (!record.id || !record.member.trim() || !record.label.trim()) throw new Error("Member and record name are required.");
  if (!FAMILY_CATEGORIES.includes(record.category)) throw new Error("Choose a valid family record category.");
}

export function applyFamilyPatch(record: FamilyRecord, patch: FamilyPatch): FamilyRecord {
  const next = { ...record, ...patch };
  validateFamilyRecord(next);
  return next;
}

/** Deterministic, local-only intake. Private values and leading zeroes are never coerced. */
export function parseFamilyImport(input: string, existing: FamilyRecord[] = []): { rows: FamilyRecord[]; errors: string[]; duplicates: number } {
  try {
    if (new TextEncoder().encode(input).length > FAMILY_IMPORT_BYTES) throw new Error("Choose a file smaller than 5 MB.");
    const text = input.trim();
    if (!text) return { rows: [], errors: [], duplicates: 0 };
    let source: unknown[];
    const isJson = text.startsWith("[") || text.startsWith("{");
    const free = () => parseFreeText(text).map(r => ({ ...r, category: guessCategory(`${r.label} ${r.value}`) }));
    try {
    if (!isJson && !looksLikeCsv(text)) source = free();
    else if (isJson) {
      const json: unknown = JSON.parse(text);
      if (!Array.isArray(json)) throw new Error("JSON must contain an array of family records.");
      source = json;
    } else {
      const alias: Record<string, string> = { name: "member", person: "member", "family member": "member", title: "label", record: "label", type: "category", number: "value", secret: "value", note: "notes" };
      const result = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), { header: true, skipEmptyLines: "greedy", dynamicTyping: false, delimitersToGuess: [",", ";", "\t", "|"], transformHeader: h => { const t = h.trim().replace(/^"|"$/g, ""); return alias[t.toLowerCase()] ?? t; } });
      const fatal = result.errors.filter(e => e.type === "Quotes");
      if (fatal.length) result.errors = fatal; else result.errors = [];
      if (result.errors.length) throw new Error(`CSV could not be read near row ${(result.errors[0].row ?? 0) + 2}. Check columns and quoted values.`);
      source = result.data;
    }
    } catch { source = free(); } // Malformed JSON/CSV: read it as plain text instead of refusing.
    source = explodeWide(source);
    if (source.length > FAMILY_IMPORT_LIMIT) throw new Error("Import at most 5,000 family records at a time.");
    const rows: FamilyRecord[] = [], errors: string[] = [];
    source.forEach((raw, i) => {
      try {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Each record must be an object.");
        const item = raw as Record<string, unknown>;
        // Normalise keys (case, spaces, punctuation) and map common header names.
        const norm: Record<string, string> = {};
        for (const [k, v] of Object.entries(item)) {
          if (v == null) continue;
          if (k === "__parsed_extra" && Array.isArray(v)) { norm.notes = [norm.notes, ...v.map(String).filter(x => x.trim())].filter(Boolean).join("\n"); continue; }
          if (typeof v !== "string") throw new Error(`${k} must be text; quote numbers to preserve leading zeroes.`);
          const key = FAMILY_HEADER[k.toLowerCase().replace(/[^a-z0-9\u0370-\u03ff]/g, "")] ?? k.trim();
          const text = String(v);
          if (!text.trim()) continue;
          if (norm[key] && ["member", "label", "category", "value"].includes(key)) norm.notes = [norm.notes, `${k}: ${text}`].filter(Boolean).join("\n");
          else norm[key] = norm[key] ? `${norm[key]} ${text}` : text;
        }
        const extras = Object.entries(norm).filter(([k]) => !["member", "label", "category", "value", "notes"].includes(k)).map(([k, v]) => `${k}: ${v}`);
        const rawCategory = (norm.category ?? "").trim();
        const category = FAMILY_CATEGORIES.find(c => c.toLowerCase() === rawCategory.toLowerCase()) ?? guessCategory(`${rawCategory} ${norm.label ?? ""}`);
        const notes = [rawCategory && rawCategory.toLowerCase() !== category.toLowerCase() ? `Type: ${rawCategory}` : "", norm.notes ?? "", ...extras].filter(Boolean).join("\n");
        const label = (norm.label ?? "").trim() || rawCategory || extras[0]?.split(":")[0] || (norm.value ? "Record" : "");
        if (!label && !norm.value && !notes) throw new Error("Row is empty.");
        const record: FamilyRecord = { id: crypto.randomUUID(), member: (norm.member ?? "").trim() || "Unassigned", label: label || "Record", category, value: norm.value ?? "", notes };
        validateFamilyRecord(record);
        rows.push(record);
      } catch (error) { errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Invalid record."}`); }
    });
    // Merge first-name-only members into a unique full name, then drop exact repeats (in the paste or already saved).
    const sig = (r: FamilyRecord) => [r.member, r.label, r.value].map(x => fold(x.trim())).join("\u0000");
    const seen = new Set(existing.map(sig));
    let duplicates = 0;
    const unique = resolveShortNames(rows, existing.map(r => r.member)).filter(r => { const k = sig(r); if (seen.has(k)) { duplicates++; return false; } seen.add(k); return true; });
    return { rows: unique, errors, duplicates };
  } catch (error) { return { rows: [], errors: [error instanceof Error ? error.message : "File could not be read."], duplicates: 0 }; }
}

/** Spreadsheet with a member column and one column per record type (AMKA, AFM, IBAN…) → one record per filled cell. */
function explodeWide(source: unknown[]): unknown[] {
  const objs = source.filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && !Array.isArray(r));
  if (objs.length !== source.length || !objs.length) return source;
  const keyOf = (k: string) => FAMILY_HEADER[k.toLowerCase().replace(/[^a-z0-9\u0370-\u03ff]/g, "")];
  const cols = Object.keys(objs[0]).filter(k => k !== "__parsed_extra");
  const mapped = cols.map(keyOf);
  const memberCol = cols[mapped.indexOf("member")];
  if (!memberCol || mapped.includes("label")) return source;
  const typeCols = cols.filter((c, i) => c !== memberCol && (!mapped[i] || mapped[i] === "value") && mapped[i] !== "notes");
  if (typeCols.length < 2 && !(typeCols.length === 1 && mapped[cols.indexOf(typeCols[0])] !== "value")) return source;
  const noteCol = cols[mapped.indexOf("notes")];
  return objs.flatMap(r => typeCols.filter(c => String(r[c] ?? "").trim()).map(c => ({ member: String(r[memberCol] ?? ""), label: c.trim(), category: guessCategory(c), value: String(r[c]), ...(noteCol && r[noteCol] ? { notes: String(r[noteCol]) } : {}) })));
}
