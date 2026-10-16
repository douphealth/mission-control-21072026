const clean = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const generic = /^(?:role|context|instructions?|steps?|output(?: format)?|prompt\s*\d*|input|rules|task|untitled|mystery instructions)\s*:?$/i;
const topics: Array<[string, RegExp]> = [
  ["SEO & content", /\b(?:seo|serp|keywords?|indexation|canonical|backlinks?|search console|organic traffic|schema markup|aeo|geo optimization)\b/i],
  ["Development", /\b(?:python|typescript|javascript|debug\w*|code review|github|repository|software|supabase|sql|database schema)\b/i],
  ["Automation", /\b(?:automation|workflow|n8n|zapier|telegram bot|agent orchestration|webhook)\b/i],
  ["Marketing", /\b(?:affiliate|advertising|conversion|campaign|sales funnel|copywriting|social media|newsletter)\b/i],
  ["Research", /\b(?:research|literature review|fact.check|source evaluation|competitor analysis)\b/i],
  ["Design", /\b(?:ui\/ux|interface design|typography|visual identity|brand design|dashboard theme)\b/i],
  ["Writing", /\b(?:rewrite|proofread|article|storytelling|tone of voice|creative writing)\b/i],
  ["Productivity", /\b(?:task management|productivity|weekly plan|prioritiz\w*|time management)\b/i],
  ["Food & nutrition", /\b(?:recipes?|meal plan|nutrition|dietary|cooking|pantry)\b|\u03b4\u03b9\u03b1\u03c4\u03c1\u03bf\u03c6|\u03c3\u03c5\u03bd\u03c4\u03b1\u03b3/i],
  ["Fitness & training", /\b(?:running|fitness|strength training|workout|basketball|training plan)\b/i],
  ["Education & learning", /\b(?:lesson plan|tutor|homework|curriculum|exam preparation|study plan|education)\b/i],
  ["Home & gardening", /\b(?:gardening|plant care|houseplants?|pruning|soil|garden)\b/i],
  ["Image & video", /\b(?:image generation|video production|storyboard|cinematic|photography|illustration)\b/i],
  ["Business strategy", /\b(?:business plan|startup|revenue model|pricing strategy|product strategy|business strategy)\b/i],
  ["Finance & budgeting", /\b(?:budget|cash flow|accounting|financial plan|bookkeeping)\b/i],
];
export function promptTitle(content: string): string {
  const lines = content.split(/\r\n|\r|\n/).map(line => line.trim()).filter(Boolean);
  const titles = lines.filter(line => /^(?:#{1,4}\s+|\*\*)/.test(line)).map(line => line.replace(/^#{1,4}\s+|^\*\*|\*\*$/g, "").trim()).filter(line => !generic.test(line));
  return (titles[0] || lines.find(line => !generic.test(line)) || "Untitled prompt").slice(0, 100);
}
/** Local suggestions, not a claim that a model evaluated the content. Explicit categories win. */
export function promptCategory(content: string, title = ""): string {
  const explicit = content.match(/^(?:#{1,4}\s*)?(?:category|topic|\u03ba\u03b1\u03c4\u03b7\u03b3\u03bf\u03c1\u03af\u03b1)\s*:\s*([^\r\n]{2,60})$/im)?.[1]?.trim();
  if (explicit && !/[{}<>]/.test(explicit)) return explicit;
  const scores = topics.map(([category, regex]) => ({ category, score: (clean(title).match(new RegExp(regex.source, "gi"))?.length || 0) * 4 + (clean(content.slice(0, 30_000)).match(new RegExp(regex.source, "gi"))?.length || 0) })).sort((a, b) => b.score - a.score);
  return scores[0].score ? scores[0].category : "Uncategorized";
}
export function organizePromptBatch<T extends Record<string, unknown>>(rows: T[], existing: string[] = []): Array<T & { title: string; category: string }> {
  const canonical = new Map(existing.map(category => [clean(category.trim()), category.trim()]));
  const groups = new Map<string, { label: string; indexes: number[] }>();
  const suggested = rows.map(row => { const content = String(row.content || ""), title = String(row.title || "").trim() || promptTitle(content); return { ...row, title, category: String(row.category || "").trim() || promptCategory(content, title) }; });
  suggested.forEach((row, index) => {
    if (row.category !== "Uncategorized" || generic.test(row.title)) return;
    const subject = row.title.replace(/^(?:prompt\s*\d+\s*[:.-]\s*)/i, "").split(/\s+[-:|]\s+|\s+(?:planning|plan|guide|checklist|analysis|review|strategy|tutorial|tips|workflow|processing)\b/i)[0].trim();
    if (subject.length < 5 || subject.length > 42 || subject.split(/\s+/).length > 3 || /^(?:you|act|i |my |create |write |inspect |mystery|untitled)/i.test(subject)) return;
    const key = clean(subject), group = groups.get(key) || { label: subject, indexes: [] }; group.indexes.push(index); groups.set(key, group);
  });
  for (const group of groups.values()) if (group.indexes.length >= 2) for (const index of group.indexes) suggested[index].category = group.label;
  return suggested.map(row => { const key = clean(row.category), category = canonical.get(key) || row.category; canonical.set(key, category); return { ...row, category }; });
}
