import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Eye, EyeOff, Plus, Search, Trash2, Pencil, Users, ListPlus, ChevronLeft, ChevronRight, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import FormModal, { FormField, FormInput, FormSelect, FormTextarea } from "@/components/FormModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FamilyBulkImport from "@/components/FamilyBulkImport";
import SafeMarkdownPreview from "@/components/SafeMarkdownPreview";
import { useRecordSync } from "@/hooks/useRecordSync";
import { onCloudStatus } from "@/lib/cloudSync";
import { readFamilyRecords, saveFamilyRecord, familyRecordCiphertext, editFamilyRecords, deleteFamilyRecords, type FamilyRecord } from "@/lib/privateVault";
import { FAMILY_CATEGORIES, type FamilyPatch } from "@/lib/familyBulk";
import { toast } from "sonner";
const blank = (): FamilyRecord => ({ id: crypto.randomUUID(), member: "", category: "Identity", label: "", value: "", notes: "" });
const PAGE_SIZE = 30;
export default function FamilyVaultPage() {
  const [records, setRecords] = useState<FamilyRecord[]>([]);
  const [query, setQuery] = useState("");
  const [member, setMember] = useState("all");
  const [category, setCategory] = useState("all");
  const [form, setForm] = useState<FamilyRecord | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string[]>([]);
  const [bulkAdd, setBulkAdd] = useState(false);
  const [bulkEdit, setBulkEdit] = useState(false);
  const [patch, setPatch] = useState<FamilyPatch>({});
  const [busy, setBusy] = useState(false);
  const [autoStatus, setAutoStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const editBaseline = useRef<string | null>(null);
  const latestDraft = useRef<FamilyRecord | null>(null);
  const [page, setPage] = useState(1);
  const refresh = async () => setRecords((await readFamilyRecords()).sort((a, b) => a.member.localeCompare(b.member) || a.label.localeCompare(b.label, undefined, { numeric: true })));
  useEffect(() => {
    void refresh().catch(() => toast.error("Some family records could not be decrypted. Nothing was changed."));
    return onCloudStatus(status => {
      if (status === "synced") void refresh().catch(() => toast.error("Encrypted family records could not be refreshed."));
    });
  }, []);
  const members = useMemo(() => [...new Set(records.map(r => r.member))].sort(), [records]);
  const filtered = useMemo(() => records.filter(r => (member === "all" || r.member === member) && (category === "all" || r.category === category) && [r.member, r.category, r.label].join(" ").toLowerCase().includes(query.toLowerCase())), [records, member, category, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const toggle = (id: string) => setSelected(old => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const changeFilters = () => { setPage(1); setSelected(new Set()); setRevealed(new Set()); };
  async function startEdit(record: FamilyRecord) {
    if (busy) return;
    const ciphertext = await familyRecordCiphertext(record.id);
    if (!ciphertext) { toast.error("Record changed. Refresh and try again."); await refresh(); return; }
    editBaseline.current = ciphertext;
    setAutoStatus("idle");
    setForm({ ...record });
  }
  function startNew() {
    editBaseline.current = null;
    setAutoStatus("idle");
    setForm(blank());
  }
  async function persist(close = false) {
    const snapshot = latestDraft.current;
    if (!snapshot || busy || !snapshot.member.trim() || !snapshot.label.trim()) return;
    setBusy(true); setAutoStatus("saving");
    try {
      // The baseline is only advanced after an acknowledged IndexedDB write.
      await saveFamilyRecord(snapshot, editBaseline.current);
      editBaseline.current = (await familyRecordCiphertext(snapshot.id)) ?? null;
      await refresh();
      setAutoStatus("saved");
      if (close) setForm(current => current === snapshot ? null : current);
    } catch (e) {
      setAutoStatus("error");
      toast.error(e instanceof Error ? e.message : "Record not saved; draft is still open.");
    } finally { setBusy(false); }
  }
  latestDraft.current = form;
  useEffect(() => {
    if (!form || busy || !form.member.trim() || !form.label.trim()) return;
    const original = records.find(r => r.id === form.id);
    if (original && JSON.stringify(original) === JSON.stringify(form)) return;
    const timer = window.setTimeout(() => { void persist(false); }, 1100);
    return () => window.clearTimeout(timer);
  // Every form edit is an independent draft revision. After a save, refresh
  // makes the saved form equal to the persisted record and stops the timer.
  }, [form, busy, records]);
  async function editSelected() {
    if (busy || !selected.size || !Object.keys(patch).length) return;
    setBusy(true);
    try { await editFamilyRecords([...selected], patch); await refresh(); setBulkEdit(false); setSelected(new Set()); toast.success("Selected records updated"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Records not updated."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <header className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><h1 className="flex items-center gap-2 text-2xl font-bold"><Users className="shrink-0 text-primary" />Family vault</h1><p className="mt-1 text-sm text-muted-foreground">{members.length} members · {records.length} encrypted records</p></div><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setBulkAdd(true)}><ListPlus />Bulk add</Button><Button aria-label="Add family record" onClick={startNew}><Plus /><span>Add</span></Button></div></header>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_180px_160px]"><label className="col-span-2 flex items-center gap-2 rounded-md border border-input bg-background px-3 sm:col-span-1"><Search className="size-4 shrink-0 text-muted-foreground" /><input aria-label="Search family records" value={query} onChange={e => { setQuery(e.target.value); changeFilters(); }} placeholder="Search member or record" className="h-12 w-full min-w-0 bg-transparent text-base outline-none" /></label><select aria-label="Filter family member" value={member} onChange={e => { setMember(e.target.value); changeFilters(); }} className="h-12 min-w-0 rounded-md border border-input bg-background px-3"><option value="all">All members</option>{members.map(m => <option key={m}>{m}</option>)}</select><select aria-label="Filter record category" value={category} onChange={e => { setCategory(e.target.value); changeFilters(); }} className="h-12 min-w-0 rounded-md border border-input bg-background px-3"><option value="all">All categories</option>{FAMILY_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
    {selected.size > 0 && filtered.length > PAGE_SIZE && <Button variant="ghost" onClick={() => setSelected(new Set(filtered.map(r => r.id)))}>Select all {filtered.length} matching records</Button>}
    <div className="flex flex-wrap items-center gap-2 border-y border-border py-3"><Button variant="outline" disabled={!visible.length || busy} onClick={() => setSelected(old => { const next = new Set(old); const all = visible.every(r => next.has(r.id)); visible.forEach(r => all ? next.delete(r.id) : next.add(r.id)); return next; })}><CheckSquare />{visible.length > 0 && visible.every(r => selected.has(r.id)) ? "Deselect page" : "Select page"}</Button>{selected.size > 0 && <><span role="status" className="text-sm text-primary">{selected.size} selected</span><Button variant="outline" disabled={busy} onClick={() => { setPatch({}); setBulkEdit(true); }}><Pencil />Bulk edit</Button><Button variant="outline" className="text-destructive" disabled={busy} onClick={() => setDeleting([...selected])}><Trash2 />Delete</Button><Button variant="ghost" disabled={busy} onClick={() => setSelected(new Set())}>Clear</Button></>}{selected.size === 0 && <span className="text-sm text-muted-foreground">{filtered.length} records</span>}</div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.map(r => <article key={r.id} className={`min-w-0 space-y-3 rounded-lg border bg-card p-4 ${selected.has(r.id) ? "border-primary" : "border-border"}`}><div className="flex items-start gap-3"><label className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md bg-secondary"><input type="checkbox" className="size-5 accent-primary" aria-label={`Select ${r.label}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></label><div className="min-w-0 flex-1"><p className="text-xs text-primary">{r.member} · {r.category}</p><h2 className="mt-1 break-words font-semibold">{r.label}</h2><FamilySyncIndicator id={r.id} /></div><Button variant="ghost" size="icon" aria-label={`Edit ${r.label}`} onClick={() => { void startEdit(r); }}><Pencil /></Button></div><p className="break-all font-mono text-sm">{revealed.has(r.id) ? r.value : "••••••••"}</p>{revealed.has(r.id) && r.notes && <SafeMarkdownPreview className="text-muted-foreground" value={r.notes} />}<div className="flex items-center gap-2 border-t border-border pt-2"><Button variant="secondary" aria-label={`${revealed.has(r.id) ? "Hide" : "Reveal"} ${r.label}`} onClick={() => setRevealed(old => { const next = new Set(old); if (next.has(r.id)) next.delete(r.id); else next.add(r.id); return next; })}>{revealed.has(r.id) ? <EyeOff /> : <Eye />}<span>{revealed.has(r.id) ? "Hide" : "Reveal"}</span></Button><Button variant="outline" aria-label={`Copy ${r.label}`} onClick={() => void navigator.clipboard.writeText(r.value).then(() => toast.success("Value copied"), () => toast.error("Could not copy value"))}><Copy />Copy</Button><Button variant="ghost" size="icon" className="ml-auto text-destructive" aria-label={`Delete ${r.label}`} onClick={() => setDeleting([r.id])}><Trash2 /></Button></div></article>)}</div>
    {!filtered.length && <p className="py-8 text-center text-sm text-muted-foreground">{records.length ? "No matching family records." : "No family records saved."}</p>}
    {filtered.length > 0 && <div className="flex items-center justify-between gap-2"><Button variant="outline" size="icon" aria-label="Previous records page" disabled={current === 1} onClick={() => { setPage(current - 1); setRevealed(new Set()); }}><ChevronLeft /></Button><span className="text-sm text-muted-foreground">Page {current} of {pages} · {filtered.length} records</span><Button variant="outline" size="icon" aria-label="Next records page" disabled={current === pages} onClick={() => { setPage(current + 1); setRevealed(new Set()); }}><ChevronRight /></Button></div>}
    <FamilyBulkImport open={bulkAdd} onClose={() => setBulkAdd(false)} onSaved={refresh} existing={records} />
    <FormModal open={bulkEdit} onClose={() => { if (!busy) setBulkEdit(false); }} title={`Edit ${selected.size} family records`}><FormField label="Family member"><FormInput value={patch.member ?? ""} placeholder="Keep existing members" onChange={member => setPatch(old => { const next = { ...old }; if (member.trim()) next.member = member.trim(); else delete next.member; return next; })} /></FormField><FormField label="Category"><FormSelect value={patch.category ?? ""} onChange={category => setPatch(old => { const next = { ...old }; if (category) next.category = category; else delete next.category; return next; })} options={[{ value: "", label: "Keep existing categories" }, ...FAMILY_CATEGORIES.map(value => ({ value, label: value }))]} /></FormField><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={patch.notes !== undefined} onChange={e => setPatch(old => { const next = { ...old }; if (e.target.checked) next.notes = ""; else delete next.notes; return next; })} />Replace private notes</label>{patch.notes !== undefined && <FormField label="New notes (empty clears notes)"><FormTextarea value={patch.notes} onChange={notes => setPatch({ ...patch, notes })} /></FormField>}<p className="text-xs text-muted-foreground">Private values and record names remain unchanged.</p><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setBulkEdit(false)}>Cancel</Button><Button disabled={busy || !Object.keys(patch).length} onClick={() => void editSelected()}>{busy ? "Saving…" : "Apply changes"}</Button></div></FormModal>
    <FormModal open={!!form} onClose={() => { if (busy) return; if (form && (!form.member.trim() || !form.label.trim())) { if (form.member || form.label || form.value || form.notes) toast.error("Enter a family member and record name before closing, or discard this draft."); else setForm(null); return; } if (autoStatus === "error" || (form && JSON.stringify(records.find(r => r.id === form.id)) !== JSON.stringify(form))) { void persist(true); return; } setForm(null); }} title="Family record" onSubmit={() => void persist(true)} submitLabel={busy ? "Saving…" : "Save & close"}>{form && <><div className="flex justify-end"><Button type="button" variant="ghost" onClick={() => { if (window.confirm("Discard this draft without saving?")) setForm(null); }}>Discard draft</Button></div><FormField label="Family member"><FormInput value={form.member} onChange={member => setForm({ ...form, member })} /></FormField><FormField label="Category"><FormSelect value={form.category} onChange={category => setForm({ ...form, category })} options={FAMILY_CATEGORIES.map(value => ({ value, label: value }))} /></FormField><FormField label="Record name"><FormInput value={form.label} onChange={label => setForm({ ...form, label })} placeholder="Social number, bank account, policy…" /></FormField><FormField label="Private value"><FormInput type="password" value={form.value} onChange={value => setForm({ ...form, value })} /></FormField><FormField label="Private notes (Markdown)"><FormTextarea value={form.notes} onChange={notes => setForm({ ...form, notes })} /></FormField><div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live Markdown preview</span><span role="status" className={`text-xs ${autoStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}>{autoStatus === "saving" ? "Saving encrypted draft…" : autoStatus === "saved" ? "Saved on this device" : autoStatus === "error" ? "Not saved — retry" : "Autosaves after editing"}</span></div><SafeMarkdownPreview value={form.notes || "Use **bold**, *italics*, headings and lists."} /></div></>}</FormModal>
    <ConfirmDialog open={deleting.length > 0} onOpenChange={open => { if (!open) setDeleting([]); }} title={`Delete ${deleting.length} family record${deleting.length === 1 ? "" : "s"}?`} description="This deletes the selected records locally and also syncs the deletion to your connected devices. Create an encrypted backup before deleting if you need recovery." onConfirm={async () => { const ids = deleting; setBusy(true); try { await deleteFamilyRecords(ids); await refresh(); setSelected(old => new Set([...old].filter(id => !ids.includes(id)))); setRevealed(new Set()); toast.success(`${ids.length} records deleted`); } catch { toast.error("Records could not be deleted."); } finally { setBusy(false); } }} />
  </div>;
}

/** Live status comes from the durable cloud journal, not an optimistic "synced" label. */
function FamilySyncIndicator({ id }: { id: string }) {
  const state = useRecordSync("familyRecords", id);
  return <span className="mt-1 block text-xs text-muted-foreground" aria-label={`Cloud state: ${state}`}>{state === "saved" ? "Cloud synced" : state === "local-only" ? "On this device" : state === "failed" ? "Sync failed — kept locally" : "Cloud sync pending"}</span>;
}
