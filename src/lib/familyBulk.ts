import Papa from "papaparse";
import type { FamilyRecord } from "./privateVault";

export const FAMILY_CATEGORIES = ["Identity", "Banking", "Insurance", "Health", "Emergency", "Other"];
export const FAMILY_IMPORT_LIMIT = 5000;
export const FAMILY_IMPORT_BYTES = 5 * 1024 * 1024;
export type FamilyPatch = { member?: string; category?: string; notes?: string };

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
    if (text.startsWith("[") || text.startsWith("{")) {
      const json: unknown = JSON.parse(text);
      if (!Array.isArray(json)) throw new Error("JSON must contain an array of family records.");
      source = json;
    } else {
      const alias: Record<string, string> = { name: "member", person: "member", "family member": "member", title: "label", record: "label", type: "category", number: "value", secret: "value", note: "notes" };
      const result = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), { header: true, skipEmptyLines: "greedy", dynamicTyping: false, delimitersToGuess: [",", ";", "\t", "|"], transformHeader: h => { const k = h.trim().toLowerCase().replace(/^"|"$/g, ""); return alias[k] ?? k; } });
      const fatal = result.errors.filter(e => e.type === "Quotes");
      if (fatal.length) result.errors = fatal; else result.errors = [];
      if (result.errors.length) throw new Error(`CSV could not be read near row ${(result.errors[0].row ?? 0) + 2}. Check columns and quoted values.`);
      source = result.data;
    }
    if (source.length > FAMILY_IMPORT_LIMIT) throw new Error("Import at most 5,000 family records at a time.");
    const rows: FamilyRecord[] = [], errors: string[] = [];
    source.forEach((raw, i) => {
      try {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Each record must be an object.");
        const item = raw as Record<string, unknown>;
        const field = (name: string, fallback = "") => {
          const value = item[name] ?? fallback;
          if (typeof value !== "string") throw new Error(`${name} must be text; quote numbers to preserve leading zeroes.`);
          return value;
        };
        const category = field("category", "Identity").trim() || "Identity";
        const record: FamilyRecord = { id: crypto.randomUUID(), member: field("member").trim(), label: field("label").trim(), category: FAMILY_CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase()) ?? category, value: field("value"), notes: field("notes") };
        validateFamilyRecord(record);
        rows.push(record);
      } catch (error) { errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Invalid record."}`); }
    });
    return { rows, errors };
  } catch (error) { return { rows: [], errors: [error instanceof Error ? error.message : "File could not be read."] }; }
}