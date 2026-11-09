/**
 * Free-text family list reader. Handles headings by record type ("ΑΜΚΑ:"), headings by person,
 * bullets/markdown, ":", "=", dash or tab separators, lines without separators and inline
 * "Name TYPE value, TYPE value" lists. Never rejects a non-empty line.
 */
export type FreeRow = { member: string; label: string; value: string; notes?: string };

export const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const EXACT = new Set(["id", "no", "nr", "pin", "puk", "tel", "ssn", "tin", "vat", "nin", "dob", "ama", "ika", "bic", "mail", "email", "user", "pass", "code", "card", "date", "αμα", "ικα", "τηλ", "αδτ", "αφμ", "αμκα", "ημ", "κωδ", "αρ", "οαεε", "ταυτ"]);
const STEMS = ["amka", "afm", "iban", "swift", "passport", "identity", "phone", "mobile", "address", "bank", "visa", "mastercard", "licen", "birth", "blood", "insur", "policy", "doctor", "password", "username", "login", "account", "number", "social", "security", "tax", "health", "emergency", "contact", "e-mail",
  "ταυτοτ", "διαβατ", "διπλωμ", "τηλεφ", "κινητ", "σταθερ", "διευθυν", "τραπεζ", "λογαριασ", "καρτ", "αριθ", "κωδικ", "γεννησ", "ημερομην", "αιματ", "ομαδα", "ασφαλ", "εφκα", "ταμει", "γιατρ", "προσωπικ", "πιστωτ", "χρεωστ", "συνταξ", "μητρω", "αστυνομ", "ατομικ", "κυκλοφορ", "οχημ", "αυτοκιν", "πινακιδ", "υγει", "εκτακτ", "επαφ", "εμαιλ"];

export function isTypeToken(token: string) {
  const t = fold(token).replace(/[^\p{L}\p{N}-]/gu, "");
  if (!t) return false;
  return EXACT.has(t) || STEMS.some(s => t.startsWith(s));
}
export const isTypeLike = (phrase: string) => phrase.split(/[\s/._-]+/).some(isTypeToken);

/** Remove bullets, numbering, markdown emphasis and stray quotes. */
export function cleanLine(line: string) {
  return line.replace(/^\s*(?:[-*•·▪►>–—]+|\d{1,3}[.)])\s+/u, "").replace(/^#+\s*/, "").replace(/\*\*|__/g, "").replace(/^["']|["']$/g, "").trim();
}

/** Split "key<sep>value". Ignores colons inside URLs and times. */
export function splitPair(line: string): [string, string] | null {
  const seps = [/\s*:\s*(?!\/\/)/, /\s*=\s*/, /\s+[-–—]\s+/, /\t+/, /\s+\|\s+/, /\s*：\s*/];
  let best: [number, number] | null = null;
  for (const re of seps) {
    const m = re.exec(line);
    if (!m || m.index === 0) continue;
    const key = line.slice(0, m.index);
    if (key.length > 80 || /\d:\d/.test(line.slice(Math.max(0, m.index - 1), m.index + 2))) continue;
    if (!best || m.index < best[0]) best = [m.index, m[0].length];
  }
  if (best) return [line.slice(0, best[0]).trim(), line.slice(best[0] + best[1]).trim()];
  // No separator: value starts at the first token with a digit or "@".
  const tokens = line.split(/\s+/);
  const i = tokens.findIndex(t => /[\d@]/.test(t));
  if (i > 0) return [tokens.slice(0, i).join(" "), tokens.slice(i).join(" ")];
  return null;
}

const isHeading = (line: string) => /[:：]\s*$/.test(line) || (!/[\d@]/.test(line) && !splitPair(line) && line.split(/\s+/).length <= 6 && line.length <= 60);

type Block = { head: string; items: string[] };

export function parseFreeText(text: string): FreeRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map(cleanLine).filter(Boolean);
  const blocks: Block[] = [{ head: "", items: [] }];
  for (const line of lines) {
    if (isHeading(line)) blocks.push({ head: line.replace(/[:：]\s*$/, "").trim(), items: [] });
    else blocks[blocks.length - 1].items.push(line);
  }
  const rows: FreeRow[] = [];
  let person = "";
  for (const block of blocks) {
    let type = "";
    if (block.head) {
      const keys = block.items.map(l => splitPair(l)?.[0] ?? "").filter(Boolean);
      const typeKeys = keys.filter(isTypeLike).length;
      // Heading is a record type when it reads like one, or when its lines are mostly names.
      const headIsType = isTypeLike(block.head) || (keys.length > 0 && typeKeys * 2 < keys.length) || (!keys.length && !!person);
      if (headIsType) type = block.head; else person = block.head;
      if (!block.items.length && !headIsType) continue;
      if (!block.items.length) { rows.push({ member: person || "Unassigned", label: type, value: "" }); continue; }
    }
    for (const line of block.items) {
      for (const part of splitInline(line)) rows.push(readPart(part.text, part.carry, person, type));
    }
  }
  return rows;
}

/** "Αλέξιος ΑΜΚΑ 123, ΑΦΜ 456" → two parts sharing the name. */
function splitInline(line: string): { text: string; carry: string }[] {
  const parts = line.split(/\s*[;,]\s+/);
  if (parts.length < 2 || parts.filter(p => { const k = splitPair(p)?.[0]; return k && isTypeLike(k) && /[\d@]/.test(p); }).length < 2) return [{ text: line, carry: "" }];
  const first = splitPair(parts[0])?.[0] ?? "";
  const carry = first.split(/\s+/).filter(t => !isTypeToken(t)).join(" ");
  return parts.map((text, i) => ({ text, carry: i ? carry : "" }));
}

function readPart(line: string, carry: string, person: string, type: string): FreeRow {
  const pair = splitPair(line);
  if (!pair) return { member: person || carry || "Unassigned", label: type || "Note", value: line };
  const [key, value] = pair;
  const tokens = key.split(/\s+/);
  const typeWords = tokens.filter(isTypeToken).join(" ");
  const nameWords = tokens.filter(t => !isTypeToken(t)).join(" ");
  if (person && !type) return { member: person, label: key, value };
  if (person && type) return { member: person, label: `${type} · ${key}`, value };
  if (type) return { member: nameWords || carry || "Unassigned", label: typeWords ? `${type} · ${typeWords}` : type, value };
  if (typeWords && (nameWords || carry)) return { member: nameWords || carry, label: typeWords, value };
  if (typeWords) return { member: "Unassigned", label: key, value };
  return { member: key, label: "Record", value };
}

/** "Αλεξάνδρα" → "Αλεξάνδρα Παπαϊωάννου" when exactly one known full name starts with it. */
export function resolveShortNames<T extends { member: string }>(rows: T[], known: string[] = []): T[] {
  const full = [...new Set([...known, ...rows.map(r => r.member)])].filter(m => m.trim().includes(" "));
  return rows.map(r => {
    const m = r.member.trim();
    if (!m || m.includes(" ") || m === "Unassigned") return r;
    const hits = full.filter(f => fold(f.split(/\s+/)[0]) === fold(m));
    return hits.length === 1 ? { ...r, member: hits[0] } : r;
  });
}
