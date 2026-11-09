import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, FileUp, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import FormModal from "@/components/FormModal";
import { FAMILY_CATEGORIES, FAMILY_IMPORT_BYTES, parseFamilyImport } from "@/lib/familyBulk";
import { addFamilyRecords, type FamilyRecord } from "@/lib/privateVault";
import { toast } from "sonner";

const PREVIEW_LIMIT = 300;
const EXAMPLE = "ΑΜΚΑ:\nΑλέξιος Παπαϊωάννου: 26097302355\nΑναστασία Κυρίτση: 17057502266\n\nΑλεξάνδρα Παπαϊωάννου\nΑΦΜ: 123456789\nIBAN: GR16 0110 1250 0000 0001 2300 695";

export default function FamilyBulkImport({ open, onClose, onSaved, existing = [] }: { open: boolean; onClose: () => void; onSaved: () => Promise<void>; existing?: FamilyRecord[] }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [rows, setRows] = useState<FamilyRecord[]>([]);
  const [asNote, setAsNote] = useState(false);
  const [noteMember, setNoteMember] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => parseFamilyImport(input, existing), [input, existing]);
  // Editable copy of the preview; re-parsing the text resets edits.
  useEffect(() => setRows(parsed.rows), [parsed]);
  const noteRecord: FamilyRecord | null = asNote && input.trim() ? { id: "note", member: noteMember.trim() || "Unassigned", label: noteTitle.trim() || input.trim().split(/\r?\n/)[0].slice(0, 60) || "Note", category: FAMILY_CATEGORIES.includes(noteTitle) ? noteTitle : "Other", value: "", notes: input.trim() } : null;
  const valid = asNote ? (noteRecord ? [noteRecord] : []) : rows.filter(r => r.member.trim() && r.label.trim());
  const close = () => { if (!busy) { setInput(""); setReveal(false); onClose(); } };
  const update = (id: string, patch: Partial<FamilyRecord>) => setRows(old => old.map(r => r.id === id ? { ...r, ...patch } : r));
  async function save() {
    if (busy || !valid.length) return;
    setBusy(true);
    try {
      await addFamilyRecords(valid.map(r => ({ ...r, id: r.id === "note" ? crypto.randomUUID() : r.id, member: r.member.trim(), label: r.label.trim() })));
      await onSaved();
      toast.success(`${valid.length} family records added`);
      setInput(""); setReveal(false); onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Import failed. No records added."); }
    finally { setBusy(false); }
  }
  const members = new Set(valid.map(r => r.member.trim())).size;
  const unassigned = rows.filter(r => r.member === "Unassigned").length;
  return <FormModal open={open} onClose={close} title="Bulk add family records" size="lg">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-success" />Read on this device only · 5,000 records · 5 MB</span>
      <div className="flex gap-2">
        {!input && <Button variant="ghost" disabled={busy} onClick={() => setInput(EXAMPLE)}>Show example</Button>}
        <Button variant="outline" disabled={busy} onClick={() => file.current?.click()}><FileUp />Choose file</Button>
      </div>
    </div>
    <input ref={file} type="file" accept=".csv,.tsv,.txt,.json,text/csv,text/plain,application/json" className="hidden" aria-label="Import family records file" onChange={async e => {
      const selected = e.target.files?.[0]; e.target.value = "";
      if (!selected) return;
      if (selected.size > FAMILY_IMPORT_BYTES) { toast.error("Choose a file smaller than 5 MB."); return; }
      try { setInput(await selected.text()); } catch { toast.error("File could not be read."); }
    }} />
    <label className="block space-y-2 text-sm font-medium">Paste anything: lists, notes, spreadsheet rows or JSON
      <textarea aria-label="Family records to import" spellCheck={false} autoComplete="off" disabled={busy} value={input} onChange={e => setInput(e.target.value)} rows={7} className="w-full resize-y rounded-md border border-input bg-background p-3 font-mono text-sm font-normal" placeholder={EXAMPLE} />
    </label>
    <div role="radiogroup" aria-label="How to save" className="flex flex-wrap gap-2 text-sm">
      <Button size="sm" variant={asNote ? "outline" : "default"} aria-pressed={!asNote} onClick={() => setAsNote(false)}>Split into separate records</Button>
      <Button size="sm" variant={asNote ? "default" : "outline"} aria-pressed={asNote} onClick={() => setAsNote(true)}>Keep as one text note</Button>
    </div>
    {asNote && <div className="grid gap-2 sm:grid-cols-2">
      <input aria-label="Family member for note" placeholder="Family member (optional)" value={noteMember} onChange={e => setNoteMember(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
      <input aria-label="Note title" placeholder="Title (optional — first line is used)" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
      <p className="text-xs text-muted-foreground sm:col-span-2">The whole text is saved exactly as written, encrypted, in one record.</p>
    </div>}
    {!asNote && parsed.errors.length > 0 && <div role="alert" className="space-y-1 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm"><p className="font-medium">{parsed.rows.length ? `${parsed.errors.length} lines skipped — everything else can be added.` : "This text could not be read."}</p>{parsed.errors.slice(0, 3).map((error, i) => <p key={i} className="text-muted-foreground">{error}</p>)}</div>}
    {!asNote && rows.length > 0 && <section className="space-y-2" aria-label="Import preview">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{valid.length} records · {members} member{members === 1 ? "" : "s"}{parsed.duplicates > 0 && <span className="font-normal text-muted-foreground"> · {parsed.duplicates} already saved, skipped</span>}</h3>
        <Button variant="ghost" size="sm" onClick={() => setReveal(v => !v)}>{reveal ? <EyeOff /> : <Eye />}{reveal ? "Hide values" : "Show values"}</Button>
      </div>
      {unassigned > 0 && <p className="text-xs text-warning">{unassigned} records have no family member — type the name in the Member box below.</p>}
      <p className="text-xs text-muted-foreground">Check the table and fix any member or record name before adding.</p>
      <div className="max-h-[50vh] overflow-auto rounded-md border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground"><tr><th className="p-2">Member</th><th className="p-2">Record</th><th className="p-2">Category</th><th className="p-2">Value</th><th className="w-10" /></tr></thead>
          <tbody className="divide-y divide-border">{rows.slice(0, PREVIEW_LIMIT).map(r => <tr key={r.id} className={r.member === "Unassigned" ? "bg-warning/5" : ""}>
            <td className="p-1"><input aria-label="Member" value={r.member} onChange={e => update(r.id, { member: e.target.value })} className="h-9 w-full min-w-0 rounded border border-input bg-background px-2" /></td>
            <td className="p-1"><input aria-label="Record name" value={r.label} onChange={e => update(r.id, { label: e.target.value })} className="h-9 w-full min-w-0 rounded border border-input bg-background px-2" /></td>
            <td className="p-1"><select aria-label="Category" value={r.category} onChange={e => update(r.id, { category: e.target.value })} className="h-9 w-full rounded border border-input bg-background px-1">{FAMILY_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></td>
            <td className="max-w-[220px] break-all p-2 font-mono text-xs">{reveal ? r.value || "—" : r.value ? "••••••••" : "—"}</td>
            <td className="p-1"><Button variant="ghost" size="icon" aria-label={`Remove ${r.label}`} onClick={() => setRows(old => old.filter(x => x.id !== r.id))}><Trash2 /></Button></td>
          </tr>)}</tbody>
        </table>
      </div>
      {rows.length > PREVIEW_LIMIT && <p className="text-xs text-muted-foreground">Showing the first {PREVIEW_LIMIT} of {rows.length}; all {valid.length} will be added.</p>}
    </section>}
    {!rows.length && !parsed.errors.length && input.trim() && parsed.duplicates > 0 && <p className="text-sm text-muted-foreground">All {parsed.duplicates} records are already in your vault.</p>}
    <div className="flex justify-end gap-2 border-t border-border pt-4"><Button variant="outline" disabled={busy} onClick={close}>Cancel</Button><Button disabled={busy || !valid.length} onClick={() => void save()}>{busy ? "Encrypting & saving…" : asNote ? "Save note" : `Add ${valid.length || ""} records`}</Button></div>
  </FormModal>;
}
