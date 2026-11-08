import Papa from "papaparse";
import type { FamilyRecord } from "./privateVault";

export const FAMILY_CATEGORIES = ["Identity", "Banking", "Insurance", "Health", "Emergency", "Other"];
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

const TYPE_WORDS = /^(amka|afm|iban|ssn|tin|vat|passport|id|ama|adt|αμκα|αφμ|αμα|αδτ|ταυτοτητα|ταυτότητα|διαβατήριο|διαβατηριο|τηλέφωνο|τηλεφωνο|phone|email|address|διεύθυνση|διευθυνση|bank|τράπεζα|τραπεζα|swift|bic|card|κάρτα|καρτα|license|δίπλωμα|διπλωμα|birthday|dob|γέννηση|γεννηση|ημερομηνία γέννησης|ημερομηνια γεννησης|blood|ομάδα αίματος)$/i;
function isTypeWord(s: string) { return TYPE_WORDS.test(s.trim()) || /\b(iban|amka|afm|αμκα|αφμ|αριθμ|number|no\.?)\b/i.test(s); }

function guessCategory(text: string) {
  const t = text.toLowerCase();
  if (/bank|iban|swift|card|account|τράπεζ/.test(t)) return "Banking";
  if (/insur|policy|ασφάλ/.test(t)) return "Insurance";
  if (/health|amka|doctor|blood|medical|υγεία/.test(t)) return "Health";
  if (/emergency|contact|phone/.test(t)) return "Emergency";
  if (/αμκα|ασφαλιστ/.test(t)) return "Health";
  if (/αφμ|ταυτ|διαβατ|αδτ|δίπλωμα|διπλωμα|γέννησ|γεννησ/.test(t)) return "Identity";
  if (/τηλέφ|τηλεφ|έκτακτ|εκτακτ/.test(t)) return "Emergency";
  if (/passport|ssn|social|id|tax|afm|licen|birth|ταυτότ|γέννησ|γεννησ|διαβατ|αφμ|προσωπικ|αριθμ/.test(t)) return "Identity";
  return "Other";
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
export function parseFamilyImport(input: string): { rows: FamilyRecord[]; errors: string[] } {
  try {
    if (new TextEncoder().encode(input).length > FAMILY_IMPORT_BYTES) throw new Error("Choose a file smaller than 5 MB.");
    const text = input.trim();
    if (!text) return { rows: [], errors: [] };
    let source: unknown[];
    const grouped = parseGroupedList(text);
    if (grouped) source = grouped;
    else if (text.startsWith("[") || text.startsWith("{")) {
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
    return { rows, errors };
  } catch (error) { return { rows: [], errors: [error instanceof Error ? error.message : "File could not be read."] }; }
}

/** Free-text lists: a heading line ending in ":" followed by "Person: value" lines. */
function parseGroupedList(text: string): Record<string, string>[] | null {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const heading = /^([^:,;\t|]+):\s*$/, pair = /^([^:,;\t|]{1,80}):\s*(.+)$/;
  if (!lines.some(l => heading.test(l)) || !lines.every(l => heading.test(l) || pair.test(l))) return null;
  let label = "";
  const rows: Record<string, string>[] = [];
  for (const l of lines) {
    const h = l.match(heading);
    if (h) { label = h[1].trim(); continue; }
    const m = l.match(pair)!;
    const key = m[1].trim();
    // "Person:" heading with "AMKA: 123" lines → heading is the member, key is the record type.
    const keyIsType = guessCategory(key) !== "Other" || isTypeWord(key);
    const headIsType = guessCategory(label) !== "Other" || isTypeWord(label);
    if (label && keyIsType && !headIsType) rows.push({ member: label, label: key, category: guessCategory(key), value: m[2].trim() });
    else rows.push({ member: key, label: label || "Record", category: guessCategory(label), value: m[2].trim() });
  }
  return rows;
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
