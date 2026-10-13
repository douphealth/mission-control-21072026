import BulkIntakeModal from "./BulkIntakeModal";
import { useDeferredValue, useMemo, useRef, useState, type ReactNode } from "react";
import { BookOpen, Link2, Plus, Upload, Download, Search, Copy, Pin, Archive, Edit2, Trash2, ArrowUpRight, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { useAIPrompts, useLinks, useAddItem, useUpdateItem, useDeleteItem, useBulkAddItems, useBulkPatch, useBulkDeleteItems } from "@/hooks/useTableData";
import { useNavigationStore } from "@/stores/navigationStore";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { inferredLinkKind, libraryTags, normalizeLibraryRecord, inferAffiliateVertical, promptVariables, renderPrompt, safeLibraryUrl, type LibraryMode, type LibraryRecord } from "@/lib/libraryIntake";

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50";
const primary = `${button} bg-primary text-primary-foreground hover:opacity-90`;
const input = "w-full min-h-11 rounded-xl border border-border bg-background px-3 py-2 text-sm";
const PAGE_SIZE = 24;
const errorText = (error: unknown) => error instanceof Error ? error.message : "The change was not saved. Your draft is still available.";

type Row = LibraryRecord & { id: string; title: string };
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">{label}{children}</label>;
}

export default function LibraryPage({ mode }: { mode: LibraryMode }) {
  const prompts = useAIPrompts();
  const links = useLinks();
  const addItem = useAddItem(); const updateItem = useUpdateItem(); const deleteItem = useDeleteItem();
  const bulkAdd = useBulkAddItems(); const bulkPatch = useBulkPatch(); const bulkDelete = useBulkDeleteItems();
  const table = mode === "prompts" ? "notes" : "links";
  const title = mode === "prompts" ? "AI Prompts" : "Links Hub";
  const noun = mode === "prompts" ? "prompt" : "link";
  const rows = useMemo(() => (mode === "prompts" ? prompts : links).map(row => ({ ...row, title: String(row.title || "Untitled"), tags: libraryTags(row.tags) })) as Row[], [mode, prompts, links]);
  const [query, setQuery] = useState(""); const search = useDeferredValue(query.toLocaleLowerCase());
  const [kind, setKind] = useState("all"); const [status, setStatus] = useState("active");
  const [category, setCategory] = useState(""); const [tag, setTag] = useState("");
  const [network, setNetwork] = useState(""); const [website, setWebsite] = useState("");
  const [page, setPage] = useState(0); const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<LibraryRecord | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [splitSource, setSplitSource] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [usePrompt, setUsePrompt] = useState<Row | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState("");
  const [vertical, setVertical] = useState("");
  const filters = useMemo(() => ({
    categories: [...new Set(rows.map(row => row.category).filter(Boolean))].sort() as string[],
    tags: [...new Set(rows.flatMap(row => row.tags || []))].sort(),
    networks: [...new Set(rows.map(row => row.network).filter(Boolean))].sort() as string[],
    websites: [...new Set(rows.map(row => row.website).filter(Boolean))].sort() as string[],
    verticals: [...new Set(rows.map(row => row.vertical || (mode === "links" ? inferAffiliateVertical([row.title,row.category,row.merchant].join(" ")) : "")).filter(Boolean))].sort() as string[],
  }), [rows]);
  const filtered = useMemo(() => rows.filter(row => {
    if (status !== "all" && (row.status || "active") !== status) return false;
    if (kind === "pinned" && !row.pinned) return false;
    if (mode === "links" && ["affiliate", "standard"].includes(kind) && inferredLinkKind(row as any) !== kind) return false;
    if (vertical && (row.vertical || inferAffiliateVertical([row.title,row.category,row.merchant].join(" "))) !== vertical) return false;
    if (category && row.category !== category || tag && !row.tags?.includes(tag) || network && row.network !== network || website && row.website !== website) return false;
    return !search || [row.title, row.content, row.url, row.description, row.category, row.model, row.merchant, row.network, row.website, row.campaign, row.trackingId, ...(row.tags || [])].join("\n").toLocaleLowerCase().includes(search);
  }).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (b.updatedAt || b.dateAdded || "").localeCompare(a.updatedAt || a.dateAdded || "") || a.title.localeCompare(b.title)), [rows, status, kind, mode, category, tag, network, website, vertical, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const selectedIds = rows.filter(row => selected.has(row.id)).map(row => row.id);
  const clearFilters = () => { setQuery(""); setKind("all"); setStatus("active"); setCategory(""); setTag(""); setNetwork(""); setWebsite(""); setVertical(""); setPage(0); };
  async function operation(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage("");
    try { await action(); } catch (error) { const detail = errorText(error); setMessage(detail); toast.error("Not saved", { description: detail }); }
    finally { lock.current = false; setBusy(false); }
  }
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); toast.success("Copied to clipboard"); }
    catch { toast.error("Clipboard unavailable. Select and copy the text from Edit."); }
  }
  function saveEditor() {
    if (!editor) return;
    void operation(async () => {
      const record = normalizeLibraryRecord(mode, editor);
      if (editor.id) await updateItem(table, editor.id, record as any);
      else await addItem(table, record as any);
      setEditor(null); toast.success(`${mode === "prompts" ? "Prompt" : "Link"} saved`);
    });
  }
  function exportRows() {
    const content = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), [mode]: filtered }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `mission-control-${mode}.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function patchSelected(changes: Record<string, unknown>) {
    void operation(async () => { await bulkPatch(table, selectedIds, changes); setSelected(new Set()); toast.success("Selected entries updated"); });
  }
  const filterSelect = (label: string, value: string, setter: (value: string) => void, options: string[]) => (
    <select aria-label={label} className={`${input} sm:w-auto sm:max-w-56`} value={value} onChange={event => { setter(event.target.value); setPage(0); }}>
      <option value="">All {label.toLowerCase()}</option>{options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  );
  const isAffiliate = mode === "links" && editor?.kind === "affiliate";
  const editorField = (key: keyof LibraryRecord, label: string, multiline = false) => (
    <Field key={key} label={label}>{multiline
      ? <textarea disabled={busy} className={`${input} min-h-24`} value={String(editor?.[key] ?? "")} onChange={event => setEditor({ ...editor, [key]: event.target.value })} />
      : <input disabled={busy} className={input} value={String(editor?.[key] ?? "")} onChange={event => setEditor({ ...editor, [key]: event.target.value })} />}</Field>
  );
  return (
    <div className="space-y-5" data-testid={`library-${mode}`}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2"><div className="text-xs font-semibold uppercase tracking-widest text-primary">Personal library</div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">{mode === "prompts" ? <BookOpen /> : <Link2 />}{title}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{mode === "prompts" ? "Save once. Find, adapt and reuse. Original text stays intact; titles, categories and template fields are suggested locally." : "Your tools, resources and affiliate links, together. Tracking parameters stay untouched. Filter by website, network and tags."}</p>
        </div>
        <div className="flex flex-wrap gap-2"><button className={button} onClick={exportRows} disabled={!filtered.length}><Download size={16} />Export view</button>
          <button className={button} onClick={() => { setSplitSource(null); setBulkOpen(true); setMessage(""); }}><Upload size={16} />Bulk add</button>
          <button className={primary} onClick={() => { setEditor({ kind: mode === "prompts" ? "ai-prompt" : kind === "affiliate" ? "affiliate" : "standard", title: "", status: "active" }); setMessage(""); }}><Plus size={16} />New {noun}</button>
        </div>
      </header>
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3" aria-label="Library filters">
        <div className="flex flex-wrap items-center gap-2">
          {["all", "pinned", ...(mode === "links" ? ["affiliate", "standard"] : [])].map(value => <button type="button" key={value} aria-pressed={kind === value} className={`${button} ${kind === value ? "border-primary text-primary bg-primary/10" : ""}`} onClick={() => { setKind(value); setPage(0); }}>{value === "all" ? "All entries" : value === "pinned" ? "Favorites" : value === "affiliate" ? "Affiliate links" : "Standard links"}</button>)}
          <label className="flex min-w-48 flex-1 items-center gap-2 rounded-xl border border-border px-3"><Search size={17} /><input aria-label="Search library" className="min-h-11 w-full min-w-0 bg-transparent text-sm outline-none" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="Search text, tags, merchant, model..." /></label>
        </div>
        <div className="flex flex-wrap gap-2">{filterSelect("Categories", category, setCategory, filters.categories)}{filterSelect("Tags", tag, setTag, filters.tags)}
          {mode === "links" && <>{filterSelect("Industries", vertical, setVertical, filters.verticals)}{filterSelect("Networks", network, setNetwork, filters.networks)}{filterSelect("Websites", website, setWebsite, filters.websites)}</>}
          <select className={`${input} sm:w-auto`} aria-label="Status" value={status} onChange={event => { setStatus(event.target.value); setPage(0); }}><option value="active">Active</option><option value="archived">Archived</option><option value="all">All statuses</option></select>
          <button className={button} onClick={clearFilters}>Reset</button>
        </div>
      </section>
      {selectedIds.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3" role="region" aria-label="Selected entries">
        <strong className="mr-auto text-sm">{selectedIds.length} selected</strong><button disabled={busy} className={button} onClick={() => patchSelected({ pinned: true })}>Favorite</button>
        <button disabled={busy} className={button} onClick={() => patchSelected({ status: "archived" })}>Archive</button><button disabled={busy} className={button} onClick={() => patchSelected({ status: "active" })}>Restore</button>
        <button disabled={busy} className={button} onClick={() => { setBulkDeleteConfirm(""); setBulkDeleteOpen(true); }}><Trash2 size={15} />Delete selected</button>
        <button className={button} onClick={() => setSelected(new Set())}>Clear selection</button></div>}
      {message && !editor && !bulkOpen && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground"><span aria-live="polite">{filtered.length} matching / {rows.length} saved</span>
        <button className={button} disabled={!visible.length} onClick={() => setSelected(previous => new Set([...previous, ...visible.map(row => row.id)]))}><CheckSquare size={15} />Select page</button></div>
      {filtered.length === 0 ? <section className="rounded-2xl border border-dashed border-border bg-card p-10 text-center"><h2 className="text-xl font-semibold">{rows.length ? "No matching entries" : `Your ${mode === "prompts" ? "prompt" : "link"} library starts here`}</h2><p className="mt-2 text-sm text-muted-foreground">{rows.length ? "Clear the filters or try another search." : "Add one entry or paste a whole collection with Bulk add. Nothing is sent to an AI provider."}</p></section>
        : <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{visible.map(row => <article key={row.id} className="min-w-0 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
          <div className="flex items-start gap-3"><label className="grid h-11 w-11 shrink-0 place-items-center"><input type="checkbox" className="h-5 w-5" aria-label={`Select ${row.title}`} checked={selected.has(row.id)} onChange={event => setSelected(previous => { const next = new Set(previous); if (event.target.checked) next.add(row.id); else next.delete(row.id); return next; })} /></label>
            <div className="min-w-0 flex-1"><h2 className="break-words text-base font-bold">{row.title}</h2><p className="mt-1 text-xs text-muted-foreground">{mode === "links" ? row.vertical || inferAffiliateVertical([row.title,row.category,row.merchant].join(" ")) : row.category || "General"}{mode === "prompts" ? ` / ${row.model || "Any model"}` : ` / ${inferredLinkKind(row as any) === "affiliate" ? "Affiliate (check attribution)" : "Standard"}`}</p></div>
            <button className={button} disabled={busy} aria-label={`Favorite ${row.title}`} aria-pressed={!!row.pinned} onClick={() => void operation(async () => { await updateItem<Row>(table, row.id, { pinned: !row.pinned }); })}><Pin size={16} className={row.pinned ? "fill-current text-primary" : ""} /></button>
          </div>
          {mode === "prompts" ? <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{row.content}</p> : <><p className="mt-3 truncate text-sm text-primary" title={row.url}>{row.url}</p><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{[row.merchant, row.network, row.website, row.campaign].filter(Boolean).join(" / ") || row.description}</p>{(row.strategyStatus || row.verdict || row.httpStatus) && <p className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">{[row.strategyStatus && `Status: ${row.strategyStatus}`, row.verdict && `Review: ${row.verdict}`, row.httpStatus && `HTTP: ${row.httpStatus}`].filter(Boolean).join(" · ")}</p>}</>}
          <div className="mt-3 flex flex-wrap gap-1.5">{(row.tags || []).slice(0, 8).map(value => <button key={value} className="rounded-lg bg-secondary px-2 py-1 text-xs" onClick={() => { setTag(value); setPage(0); }}>{value}</button>)}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={primary} onClick={() => mode === "prompts" ? (setVariables({}), setUsePrompt(row)) : void copy(row.url || "")}><Copy size={15} />{mode === "prompts" ? "Use prompt" : "Copy URL"}</button>
            {mode === "links" && <button className={button} onClick={() => { try { window.open(safeLibraryUrl(row.url), "_blank", "noopener,noreferrer"); } catch (error) { toast.error(errorText(error)); } }}><ArrowUpRight size={15} />Open</button>}
            {mode === "prompts" && <button className={button} onClick={() => { setSplitSource(row); setBulkOpen(true); }}>Split entry</button>}
            <button className={button} onClick={() => { setEditor({ ...row, kind: mode === "prompts" ? "ai-prompt" : inferredLinkKind(row as any) }); setMessage(""); }}><Edit2 size={15} />Edit</button>
            <button className={button} disabled={busy} aria-label={`${row.status === "archived" ? "Restore" : "Archive"} ${row.title}`} onClick={() => void operation(async () => { await updateItem<Row>(table, row.id, { status: row.status === "archived" ? "active" : "archived" }); })}><Archive size={15} /></button>
            <button className={button} disabled={busy} aria-label={`Delete ${row.title}`} onClick={() => setDeleteTarget(row)}><Trash2 size={15} /></button>
          </div>
        </article>)}</div>}
      <footer className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Page {currentPage + 1} of {pages}</span><div className="flex gap-2"><button className={button} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><button className={button} disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next</button></div></footer>
      <p className="text-xs leading-relaxed text-muted-foreground">This library is not a secret vault. Store passwords and API keys in <button className="underline" onClick={() => useNavigationStore.getState().setActiveSection("credentials")}>Credentials</button>. {mode === "links" ? "Merchant, attribution, commission and disclosure details are your records, not independently verified terms. Exports include the visible entries and their metadata." : "Local suggestions do not rewrite or evaluate your prompts. Saved prompts use the existing notes storage, sync and backup pipeline."}</p>

      <Dialog open={!!editor} onOpenChange={open => { if (!open && !lock.current) setEditor(null); }}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1rem)] flex-col gap-4 overflow-hidden rounded-2xl sm:max-w-3xl">
          <DialogTitle>{editor?.id ? "Edit" : "New"} {noun}</DialogTitle><DialogDescription>{mode === "prompts" ? "Keep the original instructions; add {{variables}} for reusable templates." : "Full URLs are preserved. No tracking ID is silently replaced."}</DialogDescription>
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            {editorField("title", "Title (optional; suggested from content)")}
            {mode === "prompts" ? <>{editorField("content", "Prompt content", true)}{editorField("model", "Model / platform (optional)")}</> : <>{editorField("url", "URL")}
              <Field label="Link type"><select disabled={busy} className={input} value={editor?.kind === "affiliate" ? "affiliate" : "standard"} onChange={event => setEditor({ ...editor, kind: event.target.value as "affiliate" | "standard" })}><option value="standard">Standard</option><option value="affiliate">Affiliate</option></select></Field>
              {editorField("description", "Description", true)}{isAffiliate && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{editorField("vertical", "Industry group")}{editorField("linkType", "Relationship type")}{editorField("strategyStatus", "Strategy status (reported)")}{editorField("verdict", "Review verdict (reported)")}{editorField("httpStatus", "HTTP status (reported)")}{editorField("trackingEvidence", "Tracking evidence (reported)")}{editorField("finalUrl", "Final URL (reported)")}{editorField("affiliateDashboard", "Affiliate dashboard URL")}{editorField("merchant", "Merchant")}{editorField("network", "Affiliate network")}{editorField("website", "Website / brand")}{editorField("campaign", "Campaign")}{editorField("trackingId", "Tracking ID (metadata only)")}{editorField("commissionNotes", "Commission / terms notes (unverified)")}{editorField("disclosure", "Disclosure notes")}</div>}</>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{editorField("category", "Category (optional)")}<Field label="Tags (comma-separated)"><input disabled={busy} className={input} value={Array.isArray(editor?.tags) ? editor.tags.join(", ") : String(editor?.tags || "")} onChange={event => setEditor({ ...editor, tags: event.target.value as any })} /></Field></div>
            {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-border pt-3"><button disabled={busy} className={button} onClick={() => setEditor(null)}>Cancel</button><button disabled={busy} className={primary} onClick={saveEditor}>{busy ? "Saving..." : `Save ${noun}`}</button></div>
        </DialogContent>
      </Dialog>
      <BulkIntakeModal mode={mode} open={bulkOpen} onClose={() => setBulkOpen(false)} source={splitSource} onImport={entries => bulkAdd(table, entries as any[])} />
      <Dialog open={!!usePrompt} onOpenChange={open => { if (!open) setUsePrompt(null); }}><DialogContent className="flex max-h-[90dvh] w-[calc(100%-1rem)] flex-col overflow-hidden rounded-2xl sm:max-w-3xl"><DialogTitle>{usePrompt?.title}</DialogTitle><DialogDescription>Fill template fields locally. The saved original is not modified.</DialogDescription>
        <div className="min-h-0 space-y-3 overflow-y-auto">{promptVariables(usePrompt?.content || "").map(name => <Field key={name} label={name}><textarea className={input} value={Object.hasOwn(variables, name) ? variables[name] : ""} onChange={event => setVariables({ ...variables, [name]: event.target.value })} /></Field>)}
          <textarea aria-label="Prompt preview" readOnly className={`${input} min-h-56 font-mono`} value={renderPrompt(usePrompt?.content || "", variables)} /></div>
        <button className={primary} onClick={() => void copy(renderPrompt(usePrompt?.content || "", variables))}><Copy size={16} />Copy prompt</button></DialogContent></Dialog>
      <Dialog open={bulkDeleteOpen} onOpenChange={open => { if (!lock.current) { setBulkDeleteOpen(open); if (!open) setBulkDeleteConfirm(""); } }}><DialogContent>
        <DialogTitle>Delete {selectedIds.length} selected ${noun}{selectedIds.length === 1 ? "" : "s"}?</DialogTitle>
        <DialogDescription>This permanently deletes the selected records across the current selection (not just the page). Archiving is reversible. Export your records before deletion. Type DELETE to confirm.</DialogDescription>
        <input aria-label="Type DELETE to confirm" className={input} autoComplete="off" value={bulkDeleteConfirm} disabled={busy} onChange={event => setBulkDeleteConfirm(event.target.value)} />
        <div className="flex justify-end gap-2"><button className={button} disabled={busy} onClick={() => setBulkDeleteOpen(false)}>Cancel</button>
          <button className={button} disabled={busy || bulkDeleteConfirm !== "DELETE" || !selectedIds.length} onClick={() => void operation(async () => { await bulkDelete(table, selectedIds); setSelected(new Set()); setBulkDeleteOpen(false); setBulkDeleteConfirm(""); toast.success("Selected records deleted"); })}>Delete {selectedIds.length} records</button>
        </div></DialogContent></Dialog>
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!lock.current && !open) setDeleteTarget(null); }}><DialogContent><DialogTitle>Delete this {noun}?</DialogTitle><DialogDescription>Delete "{deleteTarget?.title}" from the library. Archiving is reversible; deletion is not.</DialogDescription>
        {message && <p role="alert" className="text-destructive">{message}</p>}<div className="flex justify-end gap-2"><button className={button} disabled={busy} onClick={() => setDeleteTarget(null)}>Cancel</button><button className={button} disabled={busy} onClick={() => void operation(async () => { if (deleteTarget) await deleteItem(table, deleteTarget.id); setDeleteTarget(null); })}>Delete entry</button></div></DialogContent></Dialog>
    </div>
  );
}
