import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CheckCircle2, Cloud, Download, Laptop, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { useDataStore } from "@/stores/dataStore";
import { BACKUP_TABLES, decryptBackup, encryptBackup, parseEnvelope, previewBackup, type BackupPreview } from "@/lib/encryptedBackup";
import { DEVICE_ROW_ID, deviceId, lastLocalBackup, recordDevice, recordLocalBackup } from "@/lib/deviceStatus";
import { getCloudStatus, getLastCloudSync, getPendingCloudCount, onCloudStatus, onDirtyRecordsChange, type CloudStatus } from "@/lib/cloudSync";

const ago = (iso?: string | null) => {
  if (!iso) return "Never";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 1) return "Just now"; if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 48) return `${h} h ago`;
  return new Date(iso).toLocaleDateString();
};

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
async function currentCounts() {
  const tables = db as unknown as Record<string, { count: () => Promise<number> }>;
  const entries = await Promise.all(BACKUP_TABLES.map(async t => [t, await tables[t].count()] as const));
  return Object.fromEntries(entries);
}

/** Records this device's last successful sync in the shared settings row. */
export function DeviceStatusRecorder() {
  useEffect(() => onCloudStatus(next => { if (next === "synced") void recordDevice({ lastSyncAt: new Date().toISOString() }).catch(() => undefined); }), []);
  return null;
}

export function EncryptedBackupPanel() {
  const exportAll = useDataStore(s => s.exportAllData);
  const importAll = useDataStore(s => s.importAllData);
  const file = useRef<HTMLInputElement>(null);
  const [pass, setPass] = useState(""); const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [envelope, setEnvelope] = useState<string>(""); const [restorePass, setRestorePass] = useState("");
  const [preview, setPreview] = useState<(BackupPreview & { json: string }) | null>(null);
  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");

  async function exportBackup() {
    if (pass.length < 8) return toast.error("Use a passphrase of at least 8 characters.");
    if (pass !== confirm) return toast.error("Passphrases don't match.");
    setBusy(true);
    try {
      download(await encryptBackup(await exportAll(), pass), `mission-control-encrypted-${stamp()}.json`);
      await recordLocalBackup(); setPass(""); setConfirm("");
      toast.success("Encrypted backup downloaded. Keep the passphrase safe — it can't be recovered.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Backup failed."); } finally { setBusy(false); }
  }
  async function check() {
    setBusy(true);
    try {
      const { json, createdAt } = await decryptBackup(envelope, restorePass);
      setPreview({ ...previewBackup(json, await currentCounts()), createdAt, json });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Backup could not be read."); } finally { setBusy(false); }
  }
  async function restore() {
    if (!preview || preview.problems.length) return;
    setBusy(true);
    try {
      // Safety copy of what's on this device right now, encrypted with the same passphrase.
      download(await encryptBackup(await exportAll(), restorePass), `mission-control-before-restore-${stamp()}.json`);
      await importAll(preview.json);
      toast.success(`Restored ${preview.total} items. A safety copy of your previous data was downloaded.`);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Restore failed — nothing was changed."); setBusy(false); }
  }
  const reset = () => { setEnvelope(""); setRestorePass(""); setPreview(null); };

  return (
    <div className="card-elevated p-6 space-y-4">
      <div><h2 className="font-semibold text-lg flex items-center gap-2"><ShieldCheck size={18} className="text-primary" />Encrypted backup</h2>
        <p className="text-sm text-muted-foreground">Everything on this device in one file, locked with a passphrase only you know.</p></div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input type="password" placeholder="Backup passphrase (8+ characters)" value={pass} onChange={e => setPass(e.target.value)} autoComplete="new-password" />
        <Input type="password" placeholder="Repeat passphrase" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
        <Button disabled={busy} onClick={() => void exportBackup()}><Download />Download</Button>
      </div>
      <div className="border-t border-border pt-4 space-y-3">
        {!envelope && <Button variant="outline" disabled={busy} onClick={() => file.current?.click()}><Upload />Restore encrypted backup…</Button>}
        <input ref={file} type="file" accept=".json" className="hidden" onChange={e => {
          const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
          if (f.size > 60_000_000) return void toast.error("Choose a backup smaller than 60 MB.");
          void f.text().then(t => { try { parseEnvelope(t); setEnvelope(t); } catch (err) { toast.error((err as Error).message); } });
        }} />
        {envelope && !preview && (
          <div className="flex flex-wrap gap-2 items-center">
            <Input className="max-w-xs" type="password" placeholder="Passphrase used for this backup" value={restorePass} onChange={e => setRestorePass(e.target.value)} />
            <Button disabled={busy || !restorePass} onClick={() => void check()}>{busy ? "Checking…" : "Check backup"}</Button>
            <Button variant="ghost" onClick={reset}>Cancel</Button>
          </div>
        )}
        {preview && (
          <div className="space-y-3">
            <p className="text-sm">Backup from <strong>{preview.createdAt ? new Date(preview.createdAt).toLocaleString() : "unknown date"}</strong> · {preview.total} items{preview.hasSettings ? " · includes settings" : ""}</p>
            {preview.problems.length > 0
              ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"><ShieldAlert size={15} className="inline mr-1" />Can't restore: {preview.problems.join("; ")}. Nothing was changed.</div>
              : <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm"><CheckCircle2 size={15} className="inline mr-1 text-primary" />Backup is valid. Sections below will be <strong>replaced</strong> by the backup; other sections stay as they are. A safety copy of your current data downloads first.</div>}
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-1">Section</th><th>Now</th><th>After restore</th><th>Change</th></tr></thead>
              <tbody>{preview.rows.map(r => { const d = r.inBackup - r.current; return (
                <tr key={r.table} className="border-t border-border"><td className="py-1">{r.table}</td><td>{r.current}</td><td>{r.inBackup}</td>
                  <td className={d < 0 ? "text-destructive font-medium" : "text-muted-foreground"}>{d === 0 ? "same" : d > 0 ? `+${d}` : d}</td></tr>); })}</tbody></table></div>
            <div className="flex gap-2"><Button disabled={busy || preview.problems.length > 0} onClick={() => void restore()}>{busy ? "Restoring…" : "Restore now"}</Button><Button variant="ghost" disabled={busy} onClick={reset}>Cancel</Button></div>
          </div>
        )}
      </div>
    </div>
  );
}

export function DataStatusPanel() {
  const [status, setStatus] = useState<CloudStatus>(getCloudStatus());
  const [pending, setPending] = useState(getPendingCloudCount());
  const [, tick] = useState(0);
  useEffect(() => {
    const a = onCloudStatus(s => { setStatus(s); setPending(getPendingCloudCount()); });
    const b = onDirtyRecordsChange(() => setPending(getPendingCloudCount()));
    const t = setInterval(() => tick(n => n + 1), 30_000);
    return () => { a(); b(); clearInterval(t); };
  }, []);
  const devices = useLiveQuery(() => db.settings.get(DEVICE_ROW_ID), [])?.deviceStatus ?? {};
  const me = deviceId();
  const lastSync = getLastCloudSync();
  const lastFile = lastLocalBackup();
  const safe = status === "synced" && pending === 0;
  const fileStale = !lastFile || Date.now() - Date.parse(lastFile) > 7 * 86_400_000;
  const list = Object.entries(devices).sort((a, b) => (b[1].lastSyncAt ?? "").localeCompare(a[1].lastSyncAt ?? ""));

  return (
    <div className="card-elevated p-6 space-y-4">
      <h2 className="font-semibold text-lg flex items-center gap-2"><Cloud size={18} className="text-primary" />Data status</h2>
      <div className={`rounded-xl border p-4 ${safe ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
        <div className="font-semibold flex items-center gap-2">{safe ? <ShieldCheck size={17} className="text-primary" /> : <ShieldAlert size={17} className="text-destructive" />}
          {safe ? "Your latest changes are saved to your Google account" : status === "signed-out" ? "Not connected to Google — changes are only on this device" : pending > 0 ? `${pending} change${pending === 1 ? "" : "s"} not yet saved to your Google account` : status === "syncing" || status === "connecting" ? "Saving…" : "Sync needs attention"}</div>
        <div className="text-sm text-muted-foreground mt-1">Last sync from this device: {ago(lastSync)} · Last encrypted backup file: {ago(lastFile)}{fileStale ? " — consider downloading a fresh one" : ""}</div>
      </div>
      <div>
        <div className="text-sm font-medium mb-2">Devices</div>
        {list.length === 0 ? <p className="text-sm text-muted-foreground">No devices recorded yet. Each device appears here after its first sync.</p> : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {list.map(([id, d]) => (
              <li key={id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 text-sm">
                <Laptop size={16} className="text-muted-foreground" />
                <span className="font-medium">{d.label}{id === me && <span className="ml-2 text-xs text-primary">This device</span>}</span>
                <span className="text-muted-foreground ml-auto">Synced {ago(d.lastSyncAt)}</span>
                <span className="text-muted-foreground">Backup file {ago(d.lastBackupAt)}</span>
              </li>))}
          </ul>)}
      </div>
    </div>
  );
}
