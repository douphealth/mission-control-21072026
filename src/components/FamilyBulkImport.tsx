import { useMemo, useRef, useState } from "react";
import { FileUp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import FormModal from "@/components/FormModal";
import { FAMILY_IMPORT_BYTES, parseFamilyImport } from "@/lib/familyBulk";
import { addFamilyRecords } from "@/lib/privateVault";
import { toast } from "sonner";

export default function FamilyBulkImport({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => parseFamilyImport(input), [input]);
  const close = () => { if (!busy) { setInput(""); onClose(); } };
  async function save() {
    if (busy || !preview.rows.length || preview.errors.length) return;
    setBusy(true);
    try {
      await addFamilyRecords(preview.rows);
      await onSaved();
      toast.success(`${preview.rows.length} family records added`);
      setInput(""); onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Import failed. No records added."); }
    finally { setBusy(false); }
  }
  return <FormModal open={open} onClose={close} title="Bulk add family records" size="lg">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-success" />5,000 records · 5 MB maximum</span>
      <Button variant="outline" disabled={busy} onClick={() => file.current?.click()}><FileUp />Choose CSV / JSON</Button>
    </div>
    <input ref={file} type="file" accept=".csv,.tsv,.json,text/csv,application/json" className="hidden" aria-label="Import family records file" onChange={async e => {
      const selected = e.target.files?.[0]; e.target.value = "";
      if (!selected) return;
      if (selected.size > FAMILY_IMPORT_BYTES) { toast.error("Choose a file smaller than 5 MB."); return; }
      try { setInput(await selected.text()); } catch { toast.error("File could not be read."); }
    }} />
    <label className="block space-y-2 text-sm font-medium">CSV, spreadsheet rows or JSON
      <textarea aria-label="Family records to import" spellCheck={false} autoComplete="off" disabled={busy} value={input} onChange={e => setInput(e.target.value)} rows={7} className="w-full resize-y rounded-md border border-input bg-background p-3 font-mono text-sm font-normal" placeholder={'member,category,label,value,notes\nAlex,Identity,Social number,"001234567",""'} />
    </label>
    {preview.errors.length > 0 && <div role="alert" className="space-y-1 text-sm text-destructive"><p>Nothing will be imported until all rows are valid.</p>{preview.errors.slice(0, 5).map((error, i) => <p key={i}>{error}</p>)}{preview.errors.length > 5 && <p>{preview.errors.length - 5} more invalid rows</p>}</div>}
    {preview.rows.length > 0 && <section className="space-y-2" aria-label="Import preview"><h3 className="text-sm font-semibold">{preview.rows.length} records ready · added as new records</h3><div className="divide-y divide-border">{preview.rows.slice(0, 5).map(r => <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2 text-sm"><span className="min-w-0 break-words">{r.member} · {r.label}<span className="block text-xs text-muted-foreground">{r.category}</span></span><span className="self-center font-mono text-muted-foreground">••••••••</span></div>)}</div></section>}
    <div className="flex justify-end gap-2 border-t border-border pt-4"><Button variant="outline" disabled={busy} onClick={close}>Cancel</Button><Button disabled={busy || !preview.rows.length || !!preview.errors.length} onClick={() => void save()}>{busy ? "Encrypting & saving…" : `Add ${preview.rows.length || ""} records`}</Button></div>
  </FormModal>;
}