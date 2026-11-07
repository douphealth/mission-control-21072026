import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import FormModal, { FormField, FormInput } from "@/components/FormModal";
import { db } from "@/lib/db";
import { decodePrivateBackup, exportPrivateVault, familyDb } from "@/lib/privateVault";
import { decrypt, encrypt } from "@/lib/encryption";
import { toast } from "sonner";
export default function VaultBackupControls() {
  const file = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  async function download() {
    if (busy) return; setBusy(true);
    try {
      const data = await exportPrivateVault(await db.credentials.toArray());
      const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "mission-control-private-vault.json"; link.click(); URL.revokeObjectURL(url);
    } catch { toast.error("Encrypted backup could not be created."); }
    finally { setBusy(false); }
  }
  async function restore() {
    if (busy) return; setBusy(true);
    try {
      const decoded = await decodePrivateBackup(backup, passphrase);
      if (!Array.isArray(decoded.data.credentials) || !Array.isArray(decoded.data.family)) throw new Error("Backup is incomplete. Nothing was imported.");
      const credentials = [];
      for (const row of decoded.data.credentials) {
        if (!row || typeof row.id !== "string" || typeof row.label !== "string") throw new Error("Invalid credential backup.");
        // Restore copies, never overwrite the current vault's entries.
        credentials.push({ ...row, id: crypto.randomUUID(), password: row.password ? await encrypt(await decrypt(row.password, decoded.deviceKey)) : "", apiKey: row.apiKey ? await encrypt(await decrypt(row.apiKey, decoded.deviceKey)) : "" });
      }
      const family = [];
      for (const row of decoded.data.family) {
        const record = JSON.parse(await decrypt(row.payload, decoded.deviceKey));
        record.id = crypto.randomUUID(); family.push({ id: record.id, payload: await encrypt(JSON.stringify(record)) });
      }
      // Separate databases: report partial restore explicitly if the second write fails.
      await db.credentials.bulkAdd(credentials);
      try { await familyDb.records.bulkAdd(family); }
      catch { throw new Error("Credentials imported, but family records could not be saved. Keep the backup."); }
      toast.success(`${credentials.length} credentials and ${family.length} family records restored as copies`);
      setBackup(""); setPassphrase("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Backup could not be imported."); }
    finally { setBusy(false); }
  }
  return <><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => void download()}><Download />Encrypted backup</Button><Button variant="outline" disabled={busy} onClick={() => file.current?.click()}><Upload />Restore backup</Button><input ref={file} type="file" accept=".json" className="hidden" onChange={e => { const selected = e.target.files?.[0]; e.target.value = ""; if (!selected) return; if (selected.size > 20_000_000) { toast.error("Choose a backup smaller than 20 MB."); return; } void selected.text().then(setBackup, () => toast.error("Could not read backup.")); }} /></div><FormModal open={!!backup} onClose={() => { if (!busy) { setBackup(""); setPassphrase(""); } }} title="Restore encrypted vault backup" onSubmit={() => void restore()} submitLabel={busy ? "Restoring…" : "Restore as copies"}><p className="text-sm text-muted-foreground">Enter the master passphrase used when creating this backup. Current records are kept; imported records are added as copies.</p><FormField label="Backup master passphrase"><FormInput type="password" value={passphrase} onChange={setPassphrase} /></FormField></FormModal></>;
}