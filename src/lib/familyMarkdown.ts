/**
 * Turns any pasted text into tidy Markdown without changing a single word.
 * Text that already uses Markdown is returned untouched.
 */
const MD_SIGNS = /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```|\|.*\|)/m;
const BULLET = /^\s*(?:[•●▪◦·–—*+-]|\d+[.)])\s+(.*)$/;
const KEY_VALUE = /^([^:|\t]{1,48}?)\s*[:：=]\s+(.+)$/;
const URLISH = /^[a-z][a-z0-9+.-]*:\/\//i;

export function looksLikeMarkdown(text: string) {
  return MD_SIGNS.test(text) || /\*\*[^*]+\*\*/.test(text);
}

function table(lines: string[]): string {
  const rows = lines.map((l) => l.split("\t").map((c) => c.trim().replace(/\|/g, "\\|")));
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => `| ${Array.from({ length: width }, (_, i) => r[i] ?? "").join(" | ")} |`;
  return [pad(rows[0]), `| ${Array(width).fill("---").join(" | ")} |`, ...rows.slice(1).map(pad)].join("\n");
}

function isHeading(line: string, next: string | undefined) {
  const t = line.trim();
  if (t.length > 60 || URLISH.test(t)) return false;
  if (/^[^:]+:$/.test(t)) return true; // "Insurance:" on its own line
  const letters = t.replace(/[^\p{L}]/gu, "");
  // SHORT ALL-CAPS lines (Greek or Latin) followed by content act as section titles.
  return letters.length >= 3 && letters === letters.toUpperCase() && letters !== letters.toLowerCase() && !!next?.trim();
}

export function toFamilyMarkdown(input: string): string {
  const text = input.replace(/\r\n?/g, "\n").trim();
  if (!text || looksLikeMarkdown(text)) return text;
  const lines = text.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/, "");
    if (!line.trim()) { if (out[out.length - 1] !== "") out.push(""); continue; }
    if (line.includes("\t")) {
      const block: string[] = [];
      while (i < lines.length && lines[i].includes("\t")) block.push(lines[i++]);
      i--;
      if (block.length > 1) { out.push("", table(block), ""); continue; }
    }
    const bullet = BULLET.exec(line);
    if (bullet) { out.push(`- ${bullet[1].trim()}`); continue; }
    const kv = KEY_VALUE.exec(line.trim());
    if (kv && !URLISH.test(line.trim())) { out.push(`- **${kv[1].trim()}:** ${kv[2].trim()}`); continue; }
    if (isHeading(line, lines[i + 1])) { out.push("", `## ${line.trim().replace(/:$/, "")}`, ""); continue; }
    // Plain lines keep their own line in the rendered note.
    const nextPlain = lines[i + 1]?.trim() && !BULLET.test(lines[i + 1]) && !KEY_VALUE.test(lines[i + 1].trim());
    out.push(nextPlain ? `${line.trim()}  ` : line.trim());
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
