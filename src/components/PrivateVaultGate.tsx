import { useEffect, useState, type ReactNode } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lockPrivateVault, unlockPrivateVault, vaultConfigured, VAULT_IDLE_MS } from "@/lib/privateVault";

export default function PrivateVaultGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setConfigured(vaultConfigured()); }, []);
  useEffect(() => {
    if (!unlocked) return;
    const lock = () => { lockPrivateVault(); setUnlocked(false); };
    let timer = setTimeout(lock, VAULT_IDLE_MS);
    const activity = () => { clearTimeout(timer); timer = setTimeout(lock, VAULT_IDLE_MS); };
    const visibility = () => { if (document.hidden) lock(); };
    window.addEventListener("pointerdown", activity); window.addEventListener("keydown", activity);
    document.addEventListener("visibilitychange", visibility);
    return () => { clearTimeout(timer); window.removeEventListener("pointerdown", activity); window.removeEventListener("keydown", activity); document.removeEventListener("visibilitychange", visibility); lockPrivateVault(); };
  }, [unlocked]);
  async function submit() {
    if (busy) return;
    if (!configured && passphrase !== confirmation) { setError("Passphrases do not match."); return; }
    setBusy(true); setError("");
    try { await unlockPrivateVault(passphrase); setPassphrase(""); setConfirmation(""); setConfigured(true); setUnlocked(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Vault could not be unlocked."); }
    finally { setBusy(false); }
  }
  if (unlocked) return <div className="private-vault space-y-4"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-3"><span className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-success" />Private vault unlocked</span><Button variant="outline" onClick={() => { lockPrivateVault(); setUnlocked(false); }}><LockKeyhole />Lock</Button></div>{children}</div>;
  return <section className="mx-auto max-w-md space-y-5 py-8 sm:py-16"><LockKeyhole className="size-10 text-primary" /><h1 className="text-2xl font-bold">{configured ? "Unlock your private vault" : "Protect your private vault"}</h1><p className="text-sm leading-relaxed text-muted-foreground">{configured ? "Use your master passphrase. Locks after five minutes idle or when you leave this tab." : "Create a master passphrase. Existing password encryption is preserved. Keep this passphrase somewhere safe: it cannot be reset or recovered."}</p><form className="space-y-4" onSubmit={e => { e.preventDefault(); void submit(); }}><label className="block space-y-2 text-sm">Master passphrase<input aria-label="Master passphrase" type="password" autoComplete={configured ? "current-password" : "new-password"} value={passphrase} onChange={e => setPassphrase(e.target.value)} className="h-12 w-full rounded-md border border-input bg-background px-3" /></label>{!configured && <label className="block space-y-2 text-sm">Confirm passphrase<input aria-label="Confirm passphrase" type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} className="h-12 w-full rounded-md border border-input bg-background px-3" /></label>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button className="h-12 w-full" disabled={busy || !passphrase}>{busy ? "Opening…" : configured ? "Unlock vault" : "Protect vault"}</Button></form><p className="text-xs leading-relaxed text-muted-foreground">Stored on this browser. Family records are fully encrypted; existing credential labels and account metadata remain in device storage. Use encrypted vault backups to move or recover records. This is not protection against a compromised device.</p></section>;
}