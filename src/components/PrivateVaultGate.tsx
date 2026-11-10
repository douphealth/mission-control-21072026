import { useEffect, useState, type ReactNode } from "react";
import { Copy, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { accountVaultExists, addOtherDevicePassphrase, createRecoveryCode, lockedDeviceVaults, lockPrivateVault, pendingDeviceKeyrings, publishVaultEnvelope, recoverVaultWithCode, recoveryAvailable, recoveryCodeStatus, refreshDeviceKeyrings, unlockPrivateVault, vaultConfigured } from "@/lib/privateVault";
import { toast } from "sonner";
import { vaultSessionActive } from "@/lib/encryption";

/** Pages fire this when some secrets still cannot be opened, so the gate offers another passphrase. */
export const VAULT_UNREADABLE_EVENT = "mc-vault-unreadable";
const input = "h-12 w-full rounded-md border border-input bg-background px-3";

function RecoveryCodePanel() {
  const [status, setStatus] = useState<"none" | "current" | "outdated" | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { void recoveryCodeStatus().then(setStatus); }, []);
  if (code) return <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3"><p className="text-sm font-medium">Your recovery code — write it down or store it somewhere safe. It is shown only once.</p><code className="block break-all rounded-md bg-background p-3 font-mono text-base tracking-wider">{code}</code><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { void navigator.clipboard?.writeText(code); toast.success("Recovery code copied"); }}><Copy />Copy</Button><Button onClick={() => { setCode(""); setStatus("current"); }}>I saved it</Button></div></div>;
  if (status !== "none" && status !== "outdated") return null;
  return <div className="grid gap-2 rounded-lg border border-border bg-muted/40 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><p className="text-sm">{status === "none" ? "No recovery code yet. If you forget your master passphrase, a recovery code is the only way to open your passwords again." : "A new device key was added since your recovery code was made. Create a new code so it covers every password."}</p><Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { setCode(await createRecoveryCode()); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not create a recovery code"); } finally { setBusy(false); } }}><KeyRound />{busy ? "Creating…" : "Create recovery code"}</Button></div>;
}

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
  const [, setUnreadable] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [canRecover, setCanRecover] = useState(false);
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
    void recoveryAvailable().then(setCanRecover);
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
    if ((!configured || recovering) && passphrase !== confirmation) { setError("Passphrases do not match."); return; }
    setBusy(true); setError("");
    try {
      if (recovering) { await recoverVaultWithCode(recoveryCode, passphrase); toast.success("Vault recovered. Use your new master passphrase on every device from now on."); }
      else await unlockPrivateVault(passphrase);
      setPassphrase(""); setConfirmation(""); setRecoveryCode(""); setRecovering(false); setConfigured(true); setLocked(lockedDeviceVaults()); setUnlocked(true);
    }
    catch (e) { setError(e instanceof Error ? e.message : "Vault could not be unlocked."); }
    finally { setBusy(false); }
  }
  if (unlocked) return <div className="private-vault space-y-4"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-3"><span className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-success" />Private vault unlocked</span><Button variant="outline" onClick={() => { lockPrivateVault(); setUnlocked(false); }}><LockKeyhole />Lock</Button></div><RecoveryCodePanel />{(locked > 0 || pending > 0) && <form className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3" onSubmit={e => { e.preventDefault(); void addOther(); }}><p className="text-sm">{pending > 0 ? `Your other ${pending === 1 ? "device" : `${pending} devices`} just shared ${pending === 1 ? "its" : "their"} key. Enter your master passphrase once to open those passwords here.` : `Your other ${locked === 1 ? "device uses" : `${locked} devices use`} a different master passphrase. Type that passphrase here once to open its passwords on this device.`}</p><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><input aria-label="Other device passphrase" type="password" autoComplete="current-password" value={other} onChange={e => setOther(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3" /><Button disabled={busy || !other}>{busy ? "Opening…" : "Open passwords"}</Button></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</form>}{children}</div>;
  const creating = !configured && !recovering;
  return <section className="mx-auto max-w-md space-y-5 py-8 sm:py-16"><LockKeyhole className="size-10 text-primary" /><h1 className="text-2xl font-bold">{recovering ? "Recover your private vault" : configured ? "Unlock your private vault" : "Protect your private vault"}</h1><p className="text-sm leading-relaxed text-muted-foreground">{recovering ? "Enter the recovery code you saved, then choose a new master passphrase. Your passwords stay exactly as they are." : configured ? "Use the same master passphrase on every device. Stays unlocked in this tab until you press Lock or close the tab." : "Create a master passphrase. Existing password encryption is preserved. After unlocking, create a recovery code in case you forget it."}</p><form className="space-y-4" onSubmit={e => { e.preventDefault(); void submit(); }}>{recovering && <label className="block space-y-2 text-sm">Recovery code<input aria-label="Recovery code" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)} placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" className={`${input} font-mono`} /></label>}<label className="block space-y-2 text-sm">{recovering ? "New master passphrase" : "Master passphrase"}<input aria-label={recovering ? "New master passphrase" : "Master passphrase"} type="password" autoComplete={configured && !recovering ? "current-password" : "new-password"} value={passphrase} onChange={e => setPassphrase(e.target.value)} className={input} /></label>{(creating || recovering) && <label className="block space-y-2 text-sm">Confirm passphrase<input aria-label="Confirm passphrase" type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} className={input} /></label>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button className="h-12 w-full" disabled={busy || !passphrase || (recovering && !recoveryCode)}>{busy ? "Opening…" : recovering ? "Recover vault" : configured ? "Unlock vault" : "Protect vault"}</Button></form>{configured && <button type="button" className="text-sm text-primary underline-offset-4 hover:underline" onClick={() => { setRecovering(r => !r); setError(""); setPassphrase(""); setConfirmation(""); }}>{recovering ? "Back to unlock" : canRecover ? "Forgot passphrase? Use your recovery code" : "Forgot passphrase?"}</button>}{recovering && !canRecover && <p className="text-sm text-muted-foreground">No recovery code has synced to this device yet. Open Mission Control on a device where the vault still unlocks and create one there, or restore an encrypted vault backup.</p>}<p className="text-xs leading-relaxed text-muted-foreground">Your protected key syncs with your account so passwords open on every device. Family records are fully encrypted; existing credential labels and account metadata remain in device storage. Use encrypted vault backups to move or recover records. This is not protection against a compromised device.</p></section>;
}
