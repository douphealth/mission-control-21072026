import { useEffect, useState, type ReactNode } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lockPrivateVault, unlockPrivateVault, vaultConfigurationExists } from "@/lib/privateVault";
import { vaultSessionActive } from "@/lib/encryption";

export default function PrivateVaultGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [checking, setChecking] = useState(true);
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; void vaultConfigurationExists().then(c => { if (!active) return; setConfigured(c); if (c && vaultSessionActive()) setUnlocked(true); }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Vault state unavailable."); }).finally(() => { if (active) setChecking(false); }); return () => { active = false; }; }, []);
  async function submit() {
    if (busy) return;
    if (!configured && passphrase !== confirmation) { setError("Passphrases do not match."); return; }
    setBusy(true); setError("");
    try { await unlockPrivateVault(passphrase); setPassphrase(""); setConfirmation(""); setConfigured(true); setUnlocked(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Vault could not be unlocked."); }
    finally { setBusy(false); }
  }
  if (checking) return <p role="status" className="p-6 text-sm text-muted-foreground">Checking encrypted vault configuration…</p>;
  if (unlocked) return <div className="private-vault space-y-4"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-3"><span className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-success" />Private vault unlocked</span><Button variant="outline" onClick={() => { lockPrivateVault(); setUnlocked(false); }}><LockKeyhole />Lock</Button></div>{children}</div>;
  return <section className="mx-auto max-w-md space-y-5 py-8 sm:py-16"><LockKeyhole className="size-10 text-primary" /><h1 className="text-2xl font-bold">{configured ? "Unlock your private vault" : "Protect your private vault"}</h1><p className="text-sm leading-relaxed text-muted-foreground">{configured ? "Use your master passphrase. Stays unlocked in this tab until you press Lock or close the tab." : "Create a master passphrase. Existing password encryption is preserved. Keep this passphrase somewhere safe: it cannot be reset or recovered."}</p><form className="space-y-4" onSubmit={e => { e.preventDefault(); void submit(); }}><label className="block space-y-2 text-sm">Master passphrase<input aria-label="Master passphrase" type="password" autoComplete={configured ? "current-password" : "new-password"} value={passphrase} onChange={e => setPassphrase(e.target.value)} className="h-12 w-full rounded-md border border-input bg-background px-3" /></label>{!configured && <label className="block space-y-2 text-sm">Confirm passphrase<input aria-label="Confirm passphrase" type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} className="h-12 w-full rounded-md border border-input bg-background px-3" /></label>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button className="h-12 w-full" disabled={busy || !passphrase || !!error && checking}>{busy ? "Opening…" : configured ? "Unlock vault" : "Protect vault"}</Button></form><p className="text-xs leading-relaxed text-muted-foreground">Family records are encrypted before synchronization to your connected Google account. Use the same master passphrase on each device. No key recovery is available: keep an encrypted backup. This is not protection against a compromised device.</p></section>;
}