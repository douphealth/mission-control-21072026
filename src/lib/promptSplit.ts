export type PromptSplitRule = "auto" | "single" | "labels" | "headings" | "numbered" | "paragraphs" | "separator";
export const PROMPT_SPLIT_RULES = [
  ["auto", "Auto-detect separate prompts"], ["labels", "Prompt 1 / Prompt 2 labels"],
  ["headings", "Markdown headings / bold titles"], ["numbered", "Numbered titles (1. / 2.)"],
  ["separator", "---PROMPT--- separators"], ["paragraphs", "Blank-line-separated prompts"],
  ["single", "Keep everything as one prompt"],
] as const;
type Marker = { start: number; end: number; title: string; level: number; number?: number };
const cleanTitle = (value: string) => value.replace(/^#{1,6}\s*/, "").replace(/^\*\*|\*\*$/g, "").trim();
const roleStart = /^(?:you are\b|act as\b|your (?:task|role|goal)\b|i want you to\b|assume the role\b|as an?\b)/i;
const internalTitle = /^(?:role|context|instructions?|steps?|requirements?|constraints?|output(?: format)?|examples?|input|task|goal|rules|format|notes?)\s*:?$/i;

/** Read boundaries without modifying the original instructions. Code fences are never boundaries. */
export function splitPromptCollection(input: string, rule: PromptSplitRule = "auto") {
  const labels: Marker[] = [], headings: Marker[] = [], numbers: Marker[] = [], separators: Marker[] = [], standaloneInstructions: Marker[] = [];
  let offset = 0, fence = "", fenceLength = 0;
  for (const raw of input.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g) || []) {
    if (!raw) continue;
    const text = raw.replace(/[\r\n]+$/, ""); const start = offset; offset += raw.length;
    const fenced = text.match(/^\s*(`{3,}|~{3,})/);
    if (fenced) { if (!fence) { fence = fenced[1][0]; fenceLength = fenced[1].length; } else if (fenced[1][0] === fence && fenced[1].length >= fenceLength) fence = ""; continue; }
    if (fence) continue;
    const clean = cleanTitle(text.trim());
    // Repeated role-led blocks separated by blank lines can represent distinct
    // unlabeled prompts; preserve their complete wording and code-fence exclusion.
    if (/^\S/.test(text) && roleStart.test(clean) && (start === 0 || /(?:\r?\n){2}\s*$/.test(input.slice(0, start))))
      standaloneInstructions.push({ start, end: start, title: clean.slice(0, 100), level: 0 });
    if (/^---\s*PROMPT\s*---$/i.test(clean)) { separators.push({ start, end: offset, title: "", level: 0 }); continue; }
    const label = clean.replace(/^\d+[.)]\s*/, "").replace(/^\*\*/, "").match(/^(?:ai\s+)?prompt\s*(?:#?\s*(\d+)\s*(?:[:.)\-\u2013\u2014]\s*)?|[:\-\u2013\u2014]\s*)(.*)$/i);
    if (label) labels.push({ start, end: offset, title: label[2].replace(/\*\*$/, "").trim() || `Prompt ${label[1] || labels.length + 1}`, level: 0 });
    const heading = text.trim().match(/^(#{1,6})\s+(.+?)\s*#*$/);
    const bold = text.trim().match(/^\*\*(.+)\*\*\s*$/);
    if (heading || bold) headings.push({ start, end: offset, title: cleanTitle(heading?.[2] || bold![1]), level: heading ? heading[1].length : 7 });
    const numbered = clean.match(/^(\d{1,3})[.)]\s+(.+)$/);
    if (numbered && !/^\s{2,}/.test(text)) numbers.push({ start, end: offset, title: cleanTitle(numbered[2]), level: 0, number: Number(numbered[1]) });
  }
  const bodyStartsIndependently = (marker: Marker, next?: Marker) => roleStart.test(input.slice(marker.end, next?.start ?? input.length).trimStart());
  const independent = (markers: Marker[]) => markers.length >= 2 && markers.every((marker, i) => !internalTitle.test(marker.title) && bodyStartsIndependently(marker, markers[i + 1]));
  const groups = [...new Set(headings.map(m => m.level))].sort((a, b) => a - b).map(level => headings.filter(m => m.level === level));
  const strongHeadings = (group: Marker[]) => group.length >= 2 && group.every((m, i) => {
    if (internalTitle.test(m.title)) return false;
    const body = input.slice(m.end, group[i + 1]?.start ?? input.length);
    const descriptive = m.title.length >= 8 && /[\p{L}]/u.test(m.title);
    return bodyStartsIndependently(m, group[i + 1]) || descriptive && body.trim().length >= 140;
  });
  const topHeadings = groups.find(group => rule === "headings" ? group.length >= 2 : independent(group) || strongHeadings(group)) || [];
  const standaloneCollection = standaloneInstructions.length >= 2 && standaloneInstructions.every((marker, i) =>
    input.slice(marker.start, standaloneInstructions[i + 1]?.start ?? input.length).trim().length >= 75
  );
  const independentNumbers = numbers.filter((marker, i) => bodyStartsIndependently(marker, numbers[i + 1]));
  const numberedTitles = rule === "numbered" ? numbers : independentNumbers;
  const partition = (markers: Marker[], removeMarkers = false) => {
    const parts: { title?: string; content: string }[] = [];
    if (removeMarkers) {
      let from = 0;
      for (const marker of markers) { const content = input.slice(from, marker.start); if (content.trim()) parts.push({ content }); from = marker.end; }
      const content = input.slice(from); if (content.trim()) parts.push({ content });
    } else markers.forEach((marker, i) => { const content = input.slice(i === 0 ? 0 : marker.start, markers[i + 1]?.start ?? input.length); if (content.trim()) parts.push({ title: marker.title, content }); });
    return parts;
  };
  let method = "single";
  let parts: { title?: string; content: string }[] = [{ content: input }];
  if (rule === "paragraphs") { parts = input.split(/\r?\n[\t ]*\r?\n/).filter(p => p.trim()).map(content => ({ content })); method = "blank lines (manual)"; }
  else if (rule !== "single") {
    if (separators.length && (rule === "auto" || rule === "separator")) { parts = partition(separators, true); method = "explicit separators"; }
    else if (labels.length >= 2 && (rule === "auto" || rule === "labels")) { parts = partition(labels); method = "prompt labels"; }
    else if (topHeadings.length >= 2 && (rule === "headings" || rule === "auto" && (independent(topHeadings) || strongHeadings(topHeadings)))) { parts = partition(topHeadings); method = "headings"; }
    else if (numberedTitles.length >= 2 && (rule === "numbered" || rule === "auto" && numberedTitles.every((m, i) => m.number === i + 1) && independent(numberedTitles))) { parts = partition(numberedTitles); method = "numbered titles"; }
    else if (rule === "auto" && standaloneCollection) { parts = partition(standaloneInstructions); method = "standalone instructions"; }
  }
  const warnings = parts.length > 1
    ? [`Detected ${parts.length} separate prompts using ${method}. Review every title and prompt before saving.`]
    : rule === "single" ? ["You chose one prompt; all original text is preserved."]
      : ["Only one prompt detected. For a collection, choose a different split rule and preview again. Ordinary numbered steps and code examples are not split automatically."];
  return { parts, method, warnings };
}
