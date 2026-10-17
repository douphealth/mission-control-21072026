import { clipboardTableTSV } from "@/lib/clipboardTable";
import { organizePromptBatch } from "@/lib/promptOrganization";
import { useEffect, useRef, useState } from "react";
import { Upload, Shield } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { previewBulkIntake, CREDENTIAL_FIELDS, LINK_FIELDS, PROMPT_FIELDS, CREDENTIAL_CATEGORIES, INTAKE_BYTES, PRIVATE, type BulkMode, type BulkPreview, type IntakeOptions, type IntakeRow } from "@/lib/bulkIntake";
import { PROMPT_SPLIT_RULES, type PromptSplitRule } from "@/lib/promptSplit";
import { normalizeLibraryRecord } from "@/lib/libraryIntake";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50";
const input = "min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm";
const PAGE_SIZE = 20;
type Props = {
  mode: BulkMode; open: boolean; onClose: () => void;
  onImport: (rows: IntakeRow[]) => Promise<void | { created: number; updated: number; skipped: number }>;
  source?: { title: string; content?: string } | null;
  existingCategories?: string[];
};
export default function BulkIntakeModal({ mode, open, onClose, onImport, source, existingCategories = [] }: Props) {
  const [raw, setRaw] = useState("");
  const [options, setOptions] = useState<IntakeOptions>({});
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const [reviewed, setReviewed] = useState(false);
  const [skipInvalid, setSkipInvalid] = useState(false);
  const [singleConfirmed, setSingleConfirmed] = useState(false);
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false), revision = useRef(0), fileRevision = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const isVault = mode === "credentials";
  const fields = isVault ? CREDENTIAL_FIELDS : mode === "links" ? LINK_FIELDS : PROMPT_FIELDS;
  const table = preview?.table;
  function invalidate() { revision.current++; setPreview(null); setSelected(new Set()); setReviewed(false); setSkipInvalid(false); setSingleConfirmed(false); setSaved(false); setMessage(""); setParsing(false); setPage(0); }
  function changeRaw(value: string) { fileRevision.current++; setRaw(value); setOptions({}); invalidate(); }
  function applyPreview(result: BulkPreview) { if (mode === "prompts") result.rows = organizePromptBatch(result.rows, existingCategories); setPreview(result); setSelected(new Set(result.rows.map((_, i) => i))); setPage(0); setParsing(false); setReviewed(false); setSkipInvalid(false); setSingleConfirmed(false); setSaved(false); }
  useEffect(() => {
    if (open && source) { setRaw(source.content || ""); setOptions({}); setPreview(null); setSaved(false); setMessage(""); setSelected(new Set()); setReviewed(false); setSingleConfirmed(false); setSkipInvalid(false); revision.current++; }
  }, [open, source]);
  useEffect(() => {
    if (!open || mode !== "credentials") return;
    const stamp = ++revision.current;
    setParsing(true);
    const timer = setTimeout(() => { if (stamp === revision.current) applyPreview(previewBulkIntake(mode, raw, options)); }, 200);
    return () => clearTimeout(timer);
  }, [mode, raw, options, open]);
  async function parse(next = options) {
    if (lock.current) return;
    const stamp = ++revision.current; setParsing(true); setPreview(null); setSaved(false); setMessage("");
    await new Promise(resolve => setTimeout(resolve, 0));
    const result = previewBulkIntake(mode, raw, next);
    if (stamp === revision.current) applyPreview(result);
  }
  function changeOptions(next: IntakeOptions, reparse = false) { setOptions(next); invalidate(); if (reparse && !isVault) void parse(next); }
  function close() {
    if (lock.current) return;
    revision.current++; fileRevision.current++;
    setParsing(false);
    if (isVault) { setRaw(""); setPreview(null); setCategory(""); setOptions({}); }
    onClose();
  }
  const selection = preview?.rows.filter((_, i) => selected.has(i)) || [];
  const missingTitle = selection.some(row => !String(row[isVault ? "label" : "title"] || "").trim());
  const needsReview = (!!table?.needsReview || !!preview?.needsSecretReview) && !reviewed;
  const headerUnsafe = !!table?.suspectedDataHeader;
  const needsSingleConfirmation = mode === "prompts" && preview?.splitMethod === "single" && raw.length > 400 && options.splitRule !== "single" && !singleConfirmed;
  const canSave = !busy && !parsing && !saved && !!preview && !preview.fatal && selection.length > 0 && !missingTitle && !needsReview && !headerUnsafe && !needsSingleConfirmation && (!preview.issues.length || skipInvalid);
  async function save() {
    if (!canSave || lock.current || !preview) return;
    lock.current = true; setBusy(true); setMessage("");
    try {
      const rows = isVault ? selection.map(row => category ? { ...row, category } : row) : selection.map(row => normalizeLibraryRecord(mode, row) as IntakeRow);
      const result = await onImport(rows);
      const remaining = preview.issues.length + preview.rows.length - selection.length;
      if (result) toast.success("Import saved", { description: `${result.created} added; ${result.updated} enriched; ${result.skipped} unchanged/combined.${source ? " Original entry kept." : ""}` });
      if (remaining) { setSaved(true); setMessage(`Selected entries were saved. ${remaining} unresolved or unselected rows were not imported. Your original paste remains here; correct it and preview again.`); }
      else { setRaw(""); setPreview(null); setOptions({}); onClose(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "No rows saved. Your draft is retained."); }
    finally { lock.current = false; setBusy(false); }
  }
  const pageCount = Math.max(1, Math.ceil((preview?.rows.length || 0) / PAGE_SIZE));
  const title = isVault ? "Paste many credentials at once" : `Bulk add ${mode === "prompts" ? "AI prompts" : "links"}`;
  function editRow(index: number, field: string, value: string) {
    if (!preview) return;
    setPreview({ ...preview, rows: preview.rows.map((row, i) => i === index ? { ...row, [field]: value } : row) });
  }
  return <Dialog open={open} onOpenChange={value => { if (!value) close(); }}>
    <DialogContent data-testid={`bulk-intake-${mode}`} className="flex max-h-[92dvh] w-[calc(100%-1rem)] flex-col gap-4 overflow-hidden rounded-2xl sm:max-w-4xl" onInteractOutside={event => event.preventDefault()}>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{isVault ? "Paste spreadsheet cells, CSV/TSV, JSON or named credential blocks. Check the mapping, then encrypt and save." : mode === "prompts" ? "Paste Google Sheets title + prompt columns, including headings and bodies on adjacent rows. Each detected pair becomes its own entry; review the complete preview before saving." : "Paste spreadsheet rows with your own headings, CSV/TSV/JSON, Markdown links or one URL per line. Select the actual link column, not a login dashboard."} Up to 1,000 entries / 1 MB.</DialogDescription>
      <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
        {source && <p className="rounded-xl border border-border p-3 text-sm">Splitting a copy of <strong>{source.title}</strong>. The original is kept; archive it only after reviewing the new entries.</p>}
        <input ref={fileRef} className="hidden" type="file" accept=".json,.csv,.tsv,.txt,.md" onChange={event => {
          const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
          if (file.size > INTAKE_BYTES) { setMessage("Choose a file smaller than 1 MB."); return; }
          const stamp = ++fileRevision.current;
          void file.text().then(value => { if (stamp === fileRevision.current) changeRaw(value); }).catch(() => setMessage("Could not read the file; your draft was kept."));
        }} />
        <button className={button} disabled={busy} onClick={() => fileRef.current?.click()}><Upload size={15} />Choose file</button>
        <textarea aria-label={isVault ? "Bulk credential input" : "Bulk library input"} className={`${input} min-h-44 font-mono`} value={raw} disabled={busy} autoComplete="off" spellCheck={false} onPaste={event => { const table = clipboardTableTSV(event.clipboardData.getData("text/html")); if (table !== null) { event.preventDefault(); changeRaw(table); } }} onChange={event => changeRaw(event.target.value)} />
        {mode === "prompts" && <label className="block text-sm font-semibold">Spreadsheet layout<select aria-label="Prompt spreadsheet layout" className={input} disabled={busy} value={options.layout || "auto"} onChange={event => changeOptions({ ...options, layout: event.target.value as IntakeOptions["layout"] }, true)}><option value="auto">Auto: title cell + prompt cell per row</option><option value="prompt-pairs">Two columns: title and full prompt</option><option value="prompt-cells">Each spreadsheet cell is a complete prompt</option></select></label>}
        {mode === "prompts" && <label className="block text-sm font-semibold">Split prompts by<select aria-label="Prompt split rule" disabled={busy} className={`${input} mt-1`} value={options.splitRule || "auto"} onChange={event => changeOptions({ ...options, splitRule: event.target.value as PromptSplitRule })}>{PROMPT_SPLIT_RULES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        <button className={button} disabled={busy || parsing || !raw.trim()} onClick={() => void parse()}>{parsing ? "Reading input..." : "Preview entries"}</button>
        {table && <details open={table.needsReview || undefined} className="rounded-xl border border-border bg-secondary/20 p-3">
          <summary className="cursor-pointer text-sm font-semibold">Column mapping ({table.headers.length} columns)</summary>
          <p className="my-2 text-xs text-muted-foreground">Check which column contains each field. Sensitive account values are never displayed as header labels. Unknown columns remain excluded unless you assign them.</p>
          {table.suspectedDataHeader && <div role="alert" className="my-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3"><p className="min-w-0 flex-1 text-sm font-semibold">First row appears to be account data, not headings. Do not discard it.</p><button className={button} disabled={busy} onClick={() => changeOptions({ delimiter: table.delimiter, hasHeader: false })}>Use first row as data</button></div>}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={table.hasHeader} disabled={busy} onChange={event => changeOptions({ delimiter: table.delimiter, hasHeader: event.target.checked }, true)} />First row contains headings</label>
            <label className="flex items-center gap-2 text-sm">Delimiter<select aria-label="Import delimiter" disabled={busy} className={`${input} w-auto`} value={table.delimiter} onChange={event => changeOptions({ delimiter: event.target.value }, true)}><option value={"\t"}>Tab / spreadsheet</option><option value=",">Comma / CSV</option><option value=";">Semicolon</option><option value="|">Pipe / Markdown</option></select></label>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{table.headers.map((header, i) => <label key={i} className="flex min-w-0 flex-col gap-1 text-xs"><span className="truncate" title={header}>{i + 1}. {header}</span><select aria-label={`Column ${i + 1} mapping`} disabled={busy || table.columns[i] === PRIVATE} className={input} value={table.columns[i]} onChange={event => { const columns = [...table.columns]; columns[i] = event.target.value; changeOptions({ ...options, delimiter: table.delimiter, hasHeader: table.hasHeader, columns }, true); }}>
            {table.columns[i] === PRIVATE ? <option value={PRIVATE}>Excluded: private account data</option> : <>{!fields.some(([f]) => f === table.columns[i]) && <option value={table.columns[i]}>{table.columns[i]}</option>}{fields.map(([f, label]) => <option key={f} value={f}>{label}</option>)}</>}
          </select></label>)}</div>
        </details>}
        {preview && <div className="space-y-3" aria-live="polite">
          <strong className="text-sm">{preview.rows.length} valid entries; {preview.issues.length} errors</strong>
          {mode === "prompts" && <p className="text-sm font-medium">{preview.rows.length > 1 ? `${preview.rows.length} separate prompts detected (${preview.splitMethod || "structured data"}). Confirm each boundary and category below.` : "Only one prompt detected. If you pasted a collection, choose another split rule before saving."}</p>}
          {mode === "prompts" && <div aria-label="Detected categories" className="flex flex-wrap gap-2">{[...new Set(preview.rows.map(row => String(row.category || "Uncategorized")))].map(value => <span key={value} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs">{value} <strong>{preview.rows.filter(row => row.category === value).length}</strong></span>)}</div>}
          {preview.warnings.map(warning => <p key={warning} className="text-xs leading-relaxed text-muted-foreground">{warning}</p>)}
          {(table?.needsReview || preview.needsSecretReview) && <label className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm"><input type="checkbox" className="mt-1" checked={reviewed} disabled={busy || saved} onChange={event => setReviewed(event.target.checked)} />I checked the column mapping, including ignored columns.</label>}
          {!!preview.issues.length && <div className="space-y-3 rounded-xl border border-warning/40 bg-warning/5 p-3"><details open><summary className="cursor-pointer text-sm font-semibold">{preview.issues.length} rows need attention</summary><div className="mt-2 max-h-36 space-y-2 overflow-y-auto">{preview.issues.slice(0, 20).map((issue, i) => <p key={i} className="text-xs">{issue.line ? `Row ${issue.line}: ` : ""}{issue.message}</p>)}{preview.issues.length > 20 && <p className="text-xs">...and {preview.issues.length - 20} more. Correct the column mapping to resolve repeated errors.</p>}</div></details>
            {!preview.fatal && !!preview.rows.length && <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={skipInvalid} disabled={busy || saved} onChange={event => setSkipInvalid(event.target.checked)} />Import valid rows only; leave {preview.issues.length} unresolved rows out. Keep my original paste for correction.</label>}
          </div>}
          {isVault && <label className="block text-sm">Category override<select aria-label="Credential category override" className={`${input} mt-1`} disabled={busy || saved} value={category} onChange={event => setCategory(event.target.value)}><option value="">Keep detected categories</option>{CREDENTIAL_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></label>}
          {!!preview.rows.length && <>
            <div className="flex flex-wrap items-center gap-2 text-sm"><strong>{selection.length} selected</strong><button className={button} disabled={busy || saved} onClick={() => setSelected(new Set(preview.rows.map((_, i) => i)))}>Select all</button><button className={button} disabled={busy || saved} onClick={() => setSelected(new Set())}>Clear selection</button></div>
            <div className="divide-y divide-border rounded-xl border border-border">{preview.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((row, n) => { const index = page * PAGE_SIZE + n; return <div key={index} className="space-y-2 p-3">
              <label className="flex items-start gap-2 text-sm font-semibold"><input type="checkbox" className="mt-1" aria-label={`Include entry ${index + 1}`} checked={selected.has(index)} disabled={busy || saved} onChange={event => { const next = new Set(selected); if (event.target.checked) next.add(index); else next.delete(index); setSelected(next); }} />{index + 1}. {String(row[isVault ? "label" : "title"] || "Untitled")}</label>
              {preview.sourceLines?.[index] && <p className="text-xs text-muted-foreground">Source row {preview.sourceLines[index]}</p>}
              {mode === "links" ? <p className="break-all text-xs text-muted-foreground">{String(row.kind)} / {String(row.url)}</p> : isVault ? <p className="text-xs text-muted-foreground">{[row.username && "Account present", row.password && "Password present", row.apiKey && "Key present", row.url && "URL present"].filter(Boolean).join(" / ")}</p> : <details><summary className="cursor-pointer text-xs text-muted-foreground">{String(row.category)} / {String(row.content || "").length} characters - review full prompt</summary><pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-secondary p-3 text-xs">{String(row.content)}</pre></details>}
              <div className="grid gap-2 sm:grid-cols-2"><input aria-label={`Entry ${index + 1} title`} className={input} disabled={busy || saved} value={String(row[isVault ? "label" : "title"] || "")} onChange={event => editRow(index, isVault ? "label" : "title", event.target.value)} /><input aria-label={`Entry ${index + 1} category`} className={input} disabled={busy || saved} value={String(row.category || "")} onChange={event => editRow(index, "category", event.target.value)} /></div>
            </div>; })}</div>
            {pageCount > 1 && <div className="flex items-center justify-between gap-2 text-sm"><button className={button} disabled={!page} onClick={() => setPage(page - 1)}>Previous preview page</button><span>{page + 1} / {pageCount}</span><button className={button} disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)}>Next preview page</button></div>}
          </>}
          {needsSingleConfirmation && <label className="flex items-start gap-2 rounded-xl border border-warning/40 p-3 text-sm"><input type="checkbox" className="mt-1" checked={singleConfirmed} onChange={event => setSingleConfirmed(event.target.checked)} />I intend to save all this text as one prompt. Otherwise choose a different split rule above.</label>}
          {missingTitle && <p className="text-sm text-destructive">Give each selected entry a title before saving.</p>}
          {isVault && <p className="text-xs text-muted-foreground">Different secrets for the same account are never silently replaced. Deselect an older variant or give it a distinct label before saving.</p>}
          <p className="text-xs text-muted-foreground">Preview makes no writes. Only selected valid rows are saved, in one transaction. Invalid rows require explicit permission to leave out. A storage failure rolls back the selected batch and retains the draft.</p>
        </div>}
        {mode === "links" && <p className="text-xs text-muted-foreground">Attribution and signed URLs remain unchanged. Recognized password/account columns are excluded from this library. No URL is opened during import.</p>}
        {isVault && <p className="flex items-start gap-2 text-xs text-muted-foreground"><Shield size={16} className="shrink-0" />Secrets are encrypted before storage. The paste is only in device memory; closing this dialog discards it.</p>}
        {message && <p role={saved ? "status" : "alert"} className={`rounded-xl border p-3 text-sm ${saved ? "border-primary" : "border-destructive text-destructive"}`}>{message}</p>}
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-border pt-3"><button disabled={busy} className={button} onClick={close}>Close</button><button className={`${button} bg-primary text-primary-foreground`} disabled={!canSave} onClick={() => void save()}>{busy ? isVault ? "Encrypting and saving..." : "Saving batch..." : saved ? "Selected rows saved" : preview?.issues.length ? `Save ${selection.length} valid entries` : "Save batch"}</button></div>
    </DialogContent>
  </Dialog>;
}
