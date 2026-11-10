import { useEffect, useState, type ReactNode } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { accountVaultExists, addOtherDevicePassphrase, lockedDeviceVaults, lockPrivateVault, pendingDeviceKeyrings, publishVaultEnvelope, refreshDeviceKeyrings, unlockPrivateVault, vaultConfigured } from "@/lib/privateVault";
import { toast } from "sonner";

/** Pages fire this when some secrets still cannot be opened, so the gate offers another passphrase. */
export const VAULT_UNREADABLE_EVENT = "mc-vault-unreadable";
import { vaultSessionActive } from "@/lib/encryption";

export default function PrivateVaultGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(0);
  const [other, setOther] = useState("");
  const [pending, setPending] = useState(0);
  const [unreadable, setUnreadable] = useState(false);
  useEffect(() => {
    if (!unlocked) return;
    let alive = true;
    // Keys from other devices can arrive through sync after this tab unlocked.
    const check = async () => {
      const added = await refreshDeviceKeyrings();
      if (!alive) return;
      if (added) toast.success("Passwords from your other device are now readable here");
      setPending(await pendingDeviceKeyrings()); setLocked(lockedDeviceVaults());
    };
    const onUnreadable = () => { setUnreadable(true); void check(); };
    void check();
    const timer = window.setInterval(check, 20_000);
    window.addEventListener("focus", check); window.addEventListener(VAULT_UNREADABLE_EVENT, onUnreadable);
    return () => { alive = false; window.clearInterval(timer); window.removeEventListener("focus", check); window.removeEventListener(VAULT_UNREADABLE_EVENT, onUnreadable); };
  }, [unlocked]);
  useEffect(() => {
    const c = vaultConfigured(); setConfigured(c); if (c && vaultSessionActive()) setUnlocked(true);
    // A new device joins the account vault instead of creating a separate key.
    if (!c) void accountVaultExists().then(found => { if (found) setConfigured(true); });
    else void publishVaultEnvelope();
  }, []);
  async function addOther() {
    if (busy || !other) return;
    setBusy(true); setError("");
    try { await addOtherDevicePassphrase(other); setOther(""); setLocked(lockedDeviceVaults()); setPending(await pendingDeviceKeyrings()); setUnreadable(false); toast.success("Vault keys updated. Retrying your passwords."); }
    catch (e) { setError(e instanceof Error ? e.message : "Passphrase not accepted."); }
    finally { setBusy(false); }
  }
  async function submit() {
    if (busy) return;
    if (!configured && passphrase !== confirmation) { setError("Passphrases do not match."); return; }
    setBusy(true); setError("");
    try { await unlockPrivateVault(passphrase); setPassphrase(""); setConfirmation(""); setConfigured(true); setLocked(lockedDeviceVaults()); setUnlocked(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Vault could not be unlocked."); }
    finally { setBusy(false); }
  }
  if (unlocked) return <div className="private-vault space-y-4"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-3"><span className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-success" />Private vault unlocked</span><Button variant="outline" onClick={() => { lockPrivateVault(); setUnlocked(false); }}><LockKeyhole />Lock</Button></div>{(locked > 0 || pending > 0 || unreadable) && <form className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3" onSubmit={e => { e.preventDefault(); void addOther(); }}><p className="text-sm">{pending > 0 ? `Keys from ${pending === 1 ? "another device" : `${pending} other devices`} just synced. Enter your master passphrase once to open their passwords here.` : locked > 0 ? `Passwords saved on ${locked === 1 ? "another device use" : `${locked} other devices use`} a different master passphrase. Enter it once to open them here; this device will then use that passphrase too.` : "Some passwords were saved with a key this device doesn't have yet. Enter the master passphrase used on the device where you added them. If they still don't open, open Mission Control on that device once (same web address), then come back."}</p><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><input aria-label="Other device passphrase" type="password" autoComplete="current-password" value={other} onChange={e => setOther(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3" /><Button disabled={busy || !other}>{busy ? "Opening…" : "Open passwords"}</Button></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</form>}{children}</div>;
  return <section className="mx-auto max-w-md space-y-5 py-8 sm:py-16"><LockKeyhole className="size-10 text-primary" /><h1 className="text-2xl font-bold">{configured ? "Unlock your private vault" : "Protect your private vault"}</h1><p className="text-sm leading-relaxed text-muted-foreground">{configured ? "Use the same master passphrase on every device. Stays unlocked in this tab until you press Lock or close the tab." : "Create a master passphrase. Existing password encryption is preserved. Keep this passphrase somewhere safe: it cannot be reset or recovered."}</p><form className="space-y-4" onSubmit={e => { e.preventDefault(); void submit(); }}><label className="block space-y-2 text-sm">Master passphrase<input aria-label="Master passphrase" type="password" autoComplete={configured ? "current-password" : "new-password"} value={passphrase} onChange={e => setPassphrase(e.target.value)} className="h-12 w-full rounded-md border border-input bg-background px-3" /></label>{!configured && <label className="block space-y-2 text-sm">Confirm passphrase<input aria-label="Confirm passphrase" type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} className="h-12 w-full rounded-md border border-input bg-background px-3" /></label>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button className="h-12 w-full" disabled={busy || !passphrase}>{busy ? "Opening…" : configured ? "Unlock vault" : "Protect vault"}</Button></form><p className="text-xs leading-relaxed text-muted-foreground">Your protected key syncs with your account so passwords open on every device. Family records are fully encrypted; existing credential labels and account metadata remain in device storage. Use encrypted vault backups to move or recover records. This is not protection against a compromised device.</p></section>;
}