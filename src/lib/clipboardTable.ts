import Papa from "papaparse";
/** Read user-pasted spreadsheet HTML without mounting it, loading URLs or executing scripts. */
export function clipboardTableTSV(html: string): string | null {
  if (!html || html.length > 2_000_000 || typeof DOMParser === "undefined") return null;
  const table = new DOMParser().parseFromString(html, "text/html").querySelector("table");
  if (!table) return null;
  const text = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = (node as Element).tagName;
    if (["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(tag)) return "";
    if (tag === "BR") return "\n";
    return Array.from(node.childNodes).map(text).join("");
  };
  const rows: string[][] = [];
  for (const row of table.querySelectorAll("tr")) {
    if (row.closest("table") !== table) continue;
    const cells: string[] = [];
    for (const cell of Array.from(row.children)) {
      if (!["TD", "TH"].includes(cell.tagName)) continue;
      if (Number(cell.getAttribute("rowspan") || 1) > 1) return null;
      cells.push(text(cell));
      for (let i = 1; i < Math.min(100, Number(cell.getAttribute("colspan") || 1)); i++) cells.push("");
    }
    if (cells.length > 100 || rows.length >= 1001) return null;
    if (cells.length) rows.push(cells);
  }
  if (!rows.length || Math.max(...rows.map(row => row.length)) < 2) return null;
  return Papa.unparse(rows, { header: false, delimiter: "\t", newline: "\n" });
}
