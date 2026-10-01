from pathlib import Path

# One-time branch integration, with exact match assertions. No user data is read.
def replace(s, old, new, count=1):
    actual = s.count(old)
    if actual != count:
        raise RuntimeError(f'Expected {count} matches, found {actual}: {old[:100]!r}')
    return s.replace(old, new)
def edit(path, fn):
    p = Path(path)
    p.write_text(fn(p.read_text()))
    print('Integrated', path)

def layout(s):
    s = 'import CrossDeviceSyncBar from "@/components/CrossDeviceSyncBar";\n' + s
    return replace(s, '<TopBar />', '<TopBar />\n        <CrossDeviceSyncBar />')
edit('src/layouts/DashboardLayout.tsx', layout)

def quick(s):
    s = replace(s, 'import { useEffect, useState }', 'import { useEffect, useRef, useState }')
    s = 'import TaskDialogFrame from "@/components/TaskDialogFrame";\n' + s
    s = replace(s, '  const [saving, setSaving] = useState(false);', '''  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState(task?.category || "");
  const [project, setProject] = useState(task?.linkedProject || "");
  const pendingWrites = useRef<Promise<void>>(Promise.resolve());
  const pendingFields = useRef<Partial<Task>>({});
  const saveLock = useRef(false);''')
    s = replace(s, '  }, [task?.id, task?.title, task?.description]);', '''    setCategory(task?.category || "");
    setProject(task?.linkedProject || "");
    pendingFields.current = {};
  }, [task?.id]);''')
    a = s.index('  useEffect(() => {\n    if (!task) return;')
    b = s.index('  if (!task) return null;', a)
    s = s[:a] + s[b:]
    s = replace(s, '''  const patch = async (changes: Partial<Task>) => {
    await updateItem<Task>("tasks", task.id, { ...changes, touchedAt: today } as Partial<Task>);
  };''', '''  const patch = (changes: Partial<Task>) => {
    Object.assign(pendingFields.current, changes);
    const taskId = task.id;
    const operation = pendingWrites.current.then(async () => {
      await updateItem<Task>("tasks", taskId, { ...changes, touchedAt: today });
      for (const field of Object.keys(changes) as Array<keyof Task>) {
        if (pendingFields.current[field] === changes[field]) delete pendingFields.current[field];
      }
    });
    pendingWrites.current = operation.catch(() => {
      toast.error("Autosave failed. Your draft is retained; press Save changes to retry.");
    });
    return pendingWrites.current;
  };''')
    a = s.index('  const saveDraft = async () => {')
    b = s.index('\n  const addSubtask =', a)
    s = s[:a] + '''  const saveDraft = async () => {
    if (saveLock.current) return;
    if (!title.trim()) { toast.error("Task title is required"); return; }
    saveLock.current = true;
    setSaving(true);
    try {
      await pendingWrites.current;
      await updateItem<Task>("tasks", task.id, { ...pendingFields.current, title: title.trim(),
        description, category, linkedProject: project, touchedAt: today });
      pendingFields.current = {};
      toast.success("Task saved on this device", { description: "The synchronization bar shows when the cloud confirms the change." });
      onClose();
    } catch (error) {
      toast.error("Task could not be saved", { description: error instanceof Error ? error.message : "Your draft has been retained." });
    } finally { saveLock.current = false; setSaving(false); }
  };
''' + s[b:]
    a = s.index('  return (\n    <div\n      className="fixed')
    b = s.index('        <input\n          value={title}', a)
    s = s[:a] + '''  return (
    <TaskDialogFrame title="Edit task" onClose={() => { if (!saveLock.current) onClose(); }} action={
      <button type="button" onClick={() => void saveDraft()} disabled={saving || !title.trim()}
        className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
        <Save size={15} />{saving ? "Saving..." : "Save changes"}
      </button>
    }>
''' + s[b:]
    s = replace(s, 'defaultValue={task.category ?? ""}', 'value={category}\n              onChange={e => setCategory(e.target.value)}')
    s = replace(s, 'defaultValue={task.linkedProject ?? ""}', 'value={project}\n              onChange={e => setProject(e.target.value)}')
    # One permanent top save action, not a second button below a long form.
    a = s.index('          <button\n            type="button"\n            onClick={() => void saveDraft()}')
    b = s.index('          <button\n            onClick={async () => {', a)
    s = s[:a] + s[b:]
    s = replace(s, 'className="sticky bottom-0 -mx-4 mt-5', 'className="-mx-4 mt-5')
    s = replace(s, '      </div>\n    </div>\n  );\n}', '    </TaskDialogFrame>\n  );\n}')
    return s
edit('src/components/TaskQuickEditor.tsx', quick)

def tasks(s):
    s = 'import TaskDialogFrame from "@/components/TaskDialogFrame";\n' + s
    s = replace(s, 'onSave: (t: Omit<Task, "id"> & { id?: string }) => void;', 'onSave: (t: Omit<Task, "id"> & { id?: string }) => Promise<void>;')
    s = replace(s, '  const [newSub, setNewSub] = useState("");', '''  const [newSub, setNewSub] = useState("");
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);''')
    a = s.index('  const save = () => {')
    b = s.index('\n  const pr =', a)
    s = s[:a] + '''  const save = async () => {
    if (saveLock.current) return;
    if (!form.title.trim()) { toast.error("Title required"); return; }
    saveLock.current = true;
    setSaving(true);
    try {
      const subtasks = newSub.trim() ? [...form.subtasks, { id: crypto.randomUUID(), title: newSub.trim(), done: false }] : form.subtasks;
      await onSave({ ...form, title: form.title.trim(), subtasks, ...(task?.id ? { id: task.id } : {}) });
      onClose();
    } catch (error) {
      toast.error("Task was not saved", { description: error instanceof Error ? error.message : "The editor has retained your draft." });
    } finally { saveLock.current = false; setSaving(false); }
  };
''' + s[b:]
    a = s.index('  return (', s.index('function TaskModal('))
    b = s.index('            {/* Body */}', a)
    s = s[:a] + '''  return (
    <TaskDialogFrame open={open} title={task ? "Edit task" : "New task"}
      onClose={() => { if (!saveLock.current) onClose(); }} action={
      <button type="button" onClick={() => void save()} disabled={saving || !form.title.trim()}
        className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {saving ? "Saving..." : task ? "Save changes" : "Create task"}
      </button>
    }>
''' + s[b:]
    s = replace(s, 'className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto"', 'className="space-y-5 pb-4"')
    a = s.index('            {/* Footer */}', a)
    b = s.index('// ', a)
    # End at the known next component marker, retaining all task controls above.
    end = s.index('const KanbanCard', a)
    comment = s.rfind('// ', a, end)
    s = s[:a] + '''    </TaskDialogFrame>
  );
}

''' + s[comment:]
    return s
edit('src/pages/TasksPage.tsx', tasks)

def store(s):
    return replace(s, '    await tableRef.update(id, patch);', '''    const updated = await tableRef.update(id, patch);
    if (!updated) throw new Error("This record no longer exists. Your edits were not saved; keep the draft and refresh the task list.");''')
edit('src/stores/dataStore.ts', store)

def cloud(s):
    s = replace(s, '    installRefreshListeners();\n    const result = await flushCloudChanges();', '    installRefreshListeners();\n    if (activeSync) await activeSync;\n    const result = await flushCloudChanges();')
    return s
edit('src/lib/cloudSync.ts', cloud)

def db(s):
    s = replace(s, '  | "tiktok";', '  | "tiktok"\n  | "github"\n  | "bluesky";')
    s = replace(s, '  lastStatus?: "ok" | "unavailable" | "limited";', '''  lastStatus?: "ok" | "unavailable" | "limited";
  lastEvidence?: string;
  lastAction?: string;
  lastError?: string;
  lastSuccessAt?: string;''')
    a = s.index('export interface WatchTerm {')
    b = s.index('\n}', a)
    s = s[:b] + '\n  lastError?: string;\n  lastSuccessAt?: string;' + s[b:]
    return s
edit('src/lib/db.ts', db)

def audience_server(s):
    s = replace(s, 'import { containsExactPhrase, normalizeIntelText } from "./intelligenceQuality";\n', '')
    a = s.index('function youtubeIdentity(')
    return s[:a] + '''export function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\\./, ""); } catch { return ""; }
}
export { readAudience } from "./audienceProviders.server";
'''
edit('src/lib/controlCenter.server.ts', audience_server)

def server_functions(s):
    s = 'import { collectMentionCoverage, collectAudienceMetrics } from "./intelligenceCollectors.server";\n' + s
    s = replace(s, '  readAudience,\n', '')
    s = replace(s, '  matchIdentity,\n', '')
    s = replace(s, '  queryRelevance,\n', '  queryRelevance,\n  isRecentIso,\n')
    a = s.index('  .handler(async ({ data }) => {', s.index('export const collectMentions'))
    b = s.index('\n// ', a)
    s = s[:a] + '  .handler(async ({ data }) => collectMentionCoverage(data.terms));\n' + s[b:]
    s = replace(s, '                "tiktok",', '                "tiktok",\n                "github",\n                "bluesky",')
    a = s.index('  .handler(async ({ data }) => {', s.index('export const collectAudience'))
    b = s.index('\n// ', a)
    s = s[:a] + '  .handler(async ({ data }) => collectAudienceMetrics(data.accounts));\n' + s[b:]
    s = replace(s, 'const items = coverage.items.slice(0, 90).map', 'const items = coverage.items.filter(item => isRecentIso(item.publishedAt, data.days)).slice(0, 90).map')
    s = replace(s, '''        const retrievalCorroboration = Math.max(0, item.retrievalProviders.length - 1);
        const corroborationCount = Math.max(publishers.size, retrievalCorroboration);''', '''        // Search-engine duplication is not independent reporting or fact verification.
        const corroborationCount = publishers.size;''')
    s = replace(s, 'reason: `Similar coverage appears across ${corroboration + 1} publisher results.`', 'reason: `Similar headlines appear across ${corroboration + 1} publishers. This is not a factual verification.`')
    s = replace(s, 'Independently retrieved via', 'Also indexed by')
    return s
edit('src/lib/controlCenter.functions.ts', server_functions)

def quality(s):
    return replace(s, '    reading.followers !== null &&', '''    typeof reading.followers === "number" &&
    Number.isSafeInteger(reading.followers) &&
    reading.followers >= 0 &&''')
edit('src/lib/intelligenceQuality.ts', quality)

def client(s):
    s = 'import { coverageOutcome, isOwnedDomainCoverage } from "./intelligenceRunQuality";\n' + s
    s = replace(s, '  const now = new Date().toISOString();\n  await db.syncHealth.put({', '  const now = new Date().toISOString();\n  const previous = await db.syncHealth.get(id);\n  await db.syncHealth.put({')
    s = replace(s, 'lastSuccessAt: status === "ok" ? now : undefined,', 'lastSuccessAt: status === "ok" ? now : previous?.lastSuccessAt,')
    s = replace(s, 'return canonicalWebUrl(raw).toLowerCase();', 'return canonicalWebUrl(raw);')
    a = s.index('export async function runMentionCollector(')
    b = s.index('export async function runAudienceCollector(', a)
    s = s[:a] + '''let mentionFlight: Promise<Awaited<ReturnType<typeof collectMentionsOnce>>> | null = null;
export function runMentionCollector(useAi = true) {
  if (!mentionFlight) mentionFlight = collectMentionsOnce(useAi).finally(() => { mentionFlight = null; });
  return mentionFlight;
}
async function collectMentionsOnce(_useAi: boolean) {
  const terms = (await db.watchTerms.toArray()).filter(t => t.enabled);
  const errors: string[] = [];
  const results: Awaited<ReturnType<typeof collectMentions>>["results"] = [];
  for (const batch of chunksOf(terms, 3)) {
    try {
      const response = await collectMentions({ data: { terms: batch.map(t => ({ id: t.id, term: t.term, type: t.type, anchors: t.anchors, negatives: t.negatives })) } });
      results.push(...response.results);
    } catch (error) {
      for (const t of batch) results.push({ termId: t.id, term: t.term, items: [], checked: false,
        candidates: 0, excludedOwned: 0, rejected: 0, partial: true, providers: [], fetchedAt: new Date().toISOString(), cached: false,
        error: error instanceof Error ? error.message : "Coverage service unavailable" });
    }
  }
  const now = new Date().toISOString();
  const payload: Omit<StreamItem, "id" | "kind" | "status" | "discoveredAt">[] = [];
  for (const result of results) {
    const watch = terms.find(t => t.id === result.termId);
    await db.watchTerms.update(result.termId, { lastCheckedAt: now,
      lastSuccessAt: result.checked ? result.fetchedAt : watch?.lastSuccessAt, lastError: result.error || undefined });
    markCloudRecordDirty("watchTerms", result.termId);
    if (result.error) errors.push(`${result.term}: ${result.error}`);
    for (const item of result.items) payload.push({ ...item, source: item.source || "Publisher unavailable",
      sourceId: result.termId, matchedTerm: result.term, publishedAt: item.publishedAt || result.fetchedAt,
      dateBasis: item.publishedAt ? "published" : "discovered", score: localScore({ ...item, publishedAt: item.publishedAt || result.fetchedAt }),
      evidenceType: "multi-news" });
  }
  const cutoff = Date.now() - 30 * 86_400_000;
  const stories = (await db.streamItems.where("kind").equals("industry").toArray()).filter(i => i.status === "active" && i.evidenceType === "direct-feed" && i.dateBasis === "published" && Date.parse(i.publishedAt) >= cutoff);
  for (const term of terms) for (const story of stories) {
    if (isOwnedDomainCoverage(term, story)) continue;
    const identity = verifyMentionAgainstText(term, `${story.title} ${story.summary || ""}`, story.sourceUrl);
    if (!identity) continue;
    payload.push({ title: story.title, url: story.url, source: story.source, sourceUrl: story.sourceUrl,
      sourceId: term.id, matchedTerm: term.term, summary: story.summary, publishedAt: story.publishedAt,
      dateBasis: "published", score: localScore(story), verification: identity.verification,
      verificationReason: identity.reason, confidence: identity.confidence, matchedAnchors: identity.matchedAnchors, evidenceType: "tracked-feed" });
  }
  const added = await persistItems("mention", payload);
  const checked = results.filter(r => r.checked).length;
  const matched = new Set(payload.map(i => `${i.sourceId}:${canonicalUrl(i.url)}`)).size;
  const failed = terms.length - checked;
  const outcome = coverageOutcome(terms.length, failed, matched);
  const partial = errors.length > 0 && checked > 0;
  await writeCollectorHealth("mentions", "Mentions", outcome === "not-configured" ? "not-configured" : outcome === "unavailable" ? "error" : partial || outcome === "partial" ? "stale" : "ok",
    `${checked}/${terms.length} watch terms checked; ${matched} matching results; ${added} newly stored. Identity matching is not fact-checking.`, errors.join(" · ") || undefined);
  queueCloudPush();
  return { added, errors, checked, failed, matched, total: terms.length, partial, outcome, details: results.map(r => ({ term: r.term, checked: r.checked, matches: r.items.length, candidates: r.candidates, excludedOwned: r.excludedOwned, error: r.error, cached: r.cached, providers: r.providers })) };
}

''' + s[b:]
    a = s.index('export async function runAudienceCollector(')
    b = s.index('export async function runAllCollectors(', a)
    s = s[:a] + '''let audienceFlight: Promise<Awaited<ReturnType<typeof collectAudienceOnce>>> | null = null;
export function runAudienceCollector() {
  if (!audienceFlight) audienceFlight = collectAudienceOnce().finally(() => { audienceFlight = null; });
  return audienceFlight;
}
async function collectAudienceOnce() {
  const accounts = await db.audienceAccounts.toArray();
  const readings: Awaited<ReturnType<typeof collectAudience>>["readings"] = [];
  for (const batch of chunksOf(accounts, 6)) {
    const response = await collectAudience({ data: { accounts: batch.map(a => ({ id: a.id, platform: a.platform, url: a.url })) } });
    readings.push(...response.readings);
  }
  let succeeded = 0;
  for (const reading of readings) {
    const trusted = isTrustedAudienceReading(reading);
    const account = accounts.find(a => a.id === reading.accountId);
    if (trusted) {
      succeeded++;
      const prior = await db.audienceReadings.where("accountId").equals(reading.accountId).toArray();
      const recent = prior.filter(p => isTrustedAudienceReading(p) && Date.parse(reading.capturedAt) - Date.parse(p.capturedAt) < 12 * 3_600_000).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];
      const record = { ...reading, id: recent?.id || genId() };
      await db.audienceReadings.put(record);
      markCloudRecordDirty("audienceReadings", record.id);
    }
    await db.audienceAccounts.update(reading.accountId, { lastCheckedAt: reading.capturedAt,
      lastStatus: trusted ? "ok" : reading.status === "ok" ? "unavailable" : reading.status,
      lastEvidence: reading.evidence, lastAction: reading.action, lastError: trusted ? undefined : reading.errorCode || "metric-unavailable",
      lastSuccessAt: trusted ? reading.capturedAt : account?.lastSuccessAt });
    markCloudRecordDirty("audienceAccounts", reading.accountId);
  }
  const unavailable = readings.length - succeeded;
  const details = readings.map(r => ({ ...r, label: accounts.find(a => a.id === r.accountId)?.handle || r.accountId }));
  await writeCollectorHealth("audience", "Audience", !accounts.length ? "not-configured" : !succeeded ? "error" : unavailable ? "stale" : "ok",
    `${succeeded}/${readings.length} profiles returned a current verified metric.`, unavailable ? details.filter(r => !isTrustedAudienceReading(r)).map(r => `${r.label}: ${r.evidence}`).join(" · ") : undefined);
  queueCloudPush();
  return { updated: readings.length, succeeded, unavailable, details };
}

''' + s[b:]
    # A story may match several brands. Preserve each watch term relationship.
    s = replace(s, 'const seen = new Set(existing.map((i) => canonicalUrl(i.url)));', 'const seen = new Set(existing.map((i) => `${canonicalUrl(i.url)}${kind === "mention" ? `::${i.sourceId || i.matchedTerm || ""}` : ""}`));')
    s = replace(s, '    const key = canonicalUrl(item.url);', '    const key = `${canonicalUrl(item.url)}${kind === "mention" ? `::${item.sourceId || item.matchedTerm || ""}` : ""}`;')
    return s
edit('src/lib/controlCenter.ts', client)

def mentions(s):
    s = 'import { isOwnedDomainCoverage } from "@/lib/intelligenceRunQuality";\n' + s
    s = replace(s, 'useState<"all" | "high" | "medium">("high")', 'useState<"all" | "high" | "medium">("all")')
    s = replace(s, '  const autoScanStarted = useRef(false);', '  const autoScanStarted = useRef(false);\n  const [report, setReport] = useState<Awaited<ReturnType<typeof runMentionCollector>> | null>(null);')
    s = replace(s, '.filter((item) => item.kind === "mention" && item.status === "active")', '.filter((item) => item.kind === "mention" && item.status === "active")\n      .filter(item => { const watch = terms.find(t => t.id === item.sourceId); return !watch || !isOwnedDomainCoverage(watch, item); })')
    s = replace(s, '  }, [items, search, confidence]);', '  }, [items, search, confidence, terms]);')
    a = s.index('      const { added, errors } = await runMentionCollector();')
    b = s.index('    } catch', a)
    s = s[:a] + '''      const result = await runMentionCollector();
      setReport(result);
      if (result.outcome === "unavailable") toast.error("Mention coverage unavailable", { description: "No provider completed the scan. This is not evidence that no mentions exist." });
      else if (result.partial || result.failed) toast.warning("Mention scan partially completed", { description: `${result.checked}/${result.total} terms checked; ${result.matched} matches, ${result.added} newly saved.` });
      else toast.success(result.added ? `${result.added} new identity-matched mentions` : result.matched ? `${result.matched} matches already in your stream` : "Scan completed: no matching external coverage", { description: "Search results cover the providers checked, not the entire web. Owned-domain articles are excluded." });
''' + s[b:]
    marker = '      <section className="grid gap-2 sm:grid-cols-4">'
    s = replace(s, marker, '''      {report && <Panel>
        <div role="status" className="text-sm font-bold">{report.checked}/{report.total} terms checked · {report.matched} matches · {report.added} new</div>
        <p className="mt-1 text-xs text-muted-foreground">Identity matched in retrieved titles/snippets; not independently fact-checked. Undated web results are discovery evidence, not new publications.</p>
        <div className="mt-3 space-y-2">{report.details.map(detail => <div key={detail.term} className="rounded-xl border border-border p-3 text-xs">
          <strong>{detail.term}</strong>: {detail.checked ? `${detail.matches} matches from ${detail.candidates} candidates; ${detail.excludedOwned} owned pages excluded` : "Not checked successfully"}{detail.cached ? " · cached lookup (up to 5 minutes)" : ""}
          {detail.error && <p className="mt-1 text-warning">{detail.error}</p>}
        </div>)}</div>
      </Panel>}
''' + marker)
    s = replace(s, 'Multi-provider live coverage + tracked feeds', 'Web search + news + tracked feeds')
    s = s.replace('No verified mentions match these filters', 'No identity-matched mentions in this view')
    s = s.replace('A zero here means the identity filters rejected ambiguous coverage or no current live/tracked source produced a verified match.', 'Check the scan report above: failed providers mean unknown coverage, not zero mentions. Successful searches may return no matching external coverage.')
    s = s.replace('{watch.lastCheckedAt ? `scanned ${relTime(watch.lastCheckedAt)}` : "never scanned"}', '{watch.lastSuccessAt ? `last successful lookup ${relTime(watch.lastSuccessAt)}` : "no successful lookup recorded"}')
    return s
edit('src/pages/MentionsPage.tsx', mentions)

def audience(s):
    s = 'import { audienceProfile } from "@/lib/audienceEvidence";\n' + s
    s = replace(s, 'hosts: ["threads.net"]', 'hosts: ["threads.net", "threads.com"]')
    s = replace(s, '\n];\n\nconst nf', '''
  { id: "github", label: "GitHub", hint: "https://github.com/username", hosts: ["github.com"] },
  { id: "bluesky", label: "Bluesky", hint: "https://bsky.app/profile/handle", hosts: ["bsky.app"] },
];

const nf''')
    s = replace(s, '    const duplicate = accounts.find', '''    try { audienceProfile(platform, normalised); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Invalid profile URL"); return; }

    const duplicate = accounts.find''')
    a = s.index('      const { updated } = await runAudienceCollector();')
    b = s.index('    } catch', a)
    s = s[:a] + '''      const result = await runAudienceCollector();
      if (!result.updated) toast.info("Add a profile before refreshing");
      else if (!result.succeeded) toast.error("No current audience metrics retrieved", { description: "Every attempted profile was unavailable. See the exact reason and next action on each profile card." });
      else toast[result.unavailable ? "warning" : "success"](`${result.succeeded}/${result.updated} profiles returned verified metrics`, { description: result.unavailable ? `${result.unavailable} unavailable; previous valid readings are preserved and labeled.` : "The displayed readings came from the stated source methods." });
''' + s[b:]
    s = replace(s, '(reading) => reading.followers !== null && reading.status === "ok",', '(reading) => isTrustedAudienceReading(reading),')
    s = replace(s, '.filter((reading) => reading.followers !== null)', '.filter((reading) => isTrustedAudienceReading(reading))')
    s = replace(s, 'const comparable = Boolean(latest && previousComparable);', 'const comparable = Boolean(latest && previousComparable && !latest.approximate && !previousComparable.approximate);')
    s = replace(s, 'latest && previousComparable\n                ?', 'latest && previousComparable && comparable\n                ?')
    s = replace(s, '<article key={account.id} className="cc-audience-card">', '''<article key={account.id} className="cc-audience-card">
                {account.lastEvidence && <div className={`mb-3 rounded-xl border p-3 text-xs ${account.lastStatus === "ok" ? "border-border text-muted-foreground" : "border-warning/30 text-warning"}`} role="status">
                  <strong>{account.lastStatus === "ok" ? "Current measurement available" : "Current measurement unavailable"}</strong>
                  <p className="mt-1">{account.lastEvidence}</p>
                  {account.lastAction && <p className="mt-1 font-semibold">{account.lastAction}</p>}
                </div>}''')
    s = replace(s, '                      Followers\n', '                      {account.lastStatus !== "ok" && latest ? "Last valid follower reading (not current)" : "Followers"}\n')
    s = s.replace('YouTube uses the official YouTube Data API when <code>YOUTUBE_API_KEY</code> is', 'GitHub and Bluesky support public official API counts. YouTube uses its official API when <code>YOUTUBE_API_KEY</code> is')
    return s
edit('src/pages/AudiencePage.tsx', audience)

# Validate imports and declarations at compilation time in CI. The helper is
# removed after successful integration; normal application tests stay in Git.
