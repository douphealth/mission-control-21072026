import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  checkDeleteAdmin,
  type CleanupOutcome,
  type DeleteAdminStatus,
  type DeleteOutcome,
} from "@/lib/providerDelete.functions";
import { clearAdminPasscode, getAdminPasscode, setAdminPasscode } from "@/lib/adminPasscodeSession";
import { GOOGLE_SCOPES, readGoogleToken, requestGoogleToken } from "@/lib/googleDirectAuth";
import { ADMIN_GOOGLE_TOKEN_HEADER } from "@/lib/providerDeleteNames";

/**
 * Admin proof sent with a delete: the current Google token (verified by the
 * server with Google) and, only when the server requires it, the admin
 * passcode as a second factor. Neither is stored beyond this tab.
 */
export type AdminAuth = { googleToken: string | null; passcode: string };

const currentGoogleToken = () => readGoogleToken()?.access_token ?? null;

/** One resource that can be permanently deleted. No bulk deletes exist. */
export type DeleteTarget = {
  key: string;
  provider: "GitHub" | "Cloudflare";
  /** e.g. "repository", "Pages project", "Worker" */
  what: string;
  /** Human account label shown in the confirmation. */
  account: string;
  /** Exact text the owner must type (owner/repo or project/Worker name). */
  confirmText: string;
  consequences: string[];
  remove: (auth: AdminAuth) => Promise<DeleteOutcome>;
  /** Pages only: separate, explicitly confirmed removal of old deployments. */
  cleanup?: (auth: AdminAuth) => Promise<CleanupOutcome>;
};
export type DeletedOutcome = Extract<DeleteOutcome, { ok: true }>;

type Note = { tone: "error" | "warn" | "info"; text: string };
const NOTE_STYLE: Record<Note["tone"], string> = {
  error: "border-destructive/40 bg-destructive/10",
  warn: "border-warning/50 bg-warning/10",
  info: "border-border bg-muted/50",
};

/**
 * Accessible type-the-exact-name confirmation shared by list rows and the
 * detail Danger zone. Shows provider, account and consequences; nothing is
 * sent until the exact name is typed. Only a provider-confirmed delete closes
 * it as success — unclear answers stay visible and trigger a list refresh.
 */
export default function DeleteResourceDialog({
  target,
  onOpenChange,
  onDeleted,
  onUnsettled,
}: {
  target: DeleteTarget | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (target: DeleteTarget, outcome: DeletedOutcome) => void;
  /** Provider state is uncertain (unverified / not found): refresh from the provider. */
  onUnsettled?: (target: DeleteTarget) => void;
}) {
  const open = Boolean(target);
  const [typed, setTyped] = useState("");
  const [admin, setAdmin] = useState("");
  const [needAdmin, setNeedAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [needsCleanup, setNeedsCleanup] = useState(false);
  const [ack, setAck] = useState(false);
  const [status, setStatus] = useState<DeleteAdminStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const targetKey = target?.key;

  /** Ask the server which verified admin identity it sees (read-only, deletes nothing). */
  const recheck = useCallback(async () => {
    setChecking(true);
    try {
      const token = currentGoogleToken();
      setStatus(
        await checkDeleteAdmin({
          headers: token ? { [ADMIN_GOOGLE_TOKEN_HEADER]: token } : {},
        }),
      );
    } catch {
      setStatus({
        configured: false,
        message: "Could not check admin sign-in right now. Try again in a moment.",
        secondFactorRequired: false,
        googleReady: false,
        identity: null,
        otherEmail: null,
      });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    setTyped("");
    setAdmin("");
    setNeedAdmin(false);
    setNote(null);
    setNeedsCleanup(false);
    setAck(false);
    setStatus(null);
    if (targetKey) void recheck();
  }, [targetKey, recheck]);

  if (!target) return null;
  const matches = typed.trim() === target.confirmText;
  const secondFactor = Boolean(status?.secondFactorRequired);
  const showPasscode = secondFactor && (needAdmin || !getAdminPasscode());
  const passcode = () => (!secondFactor ? "" : showPasscode ? admin.trim() : getAdminPasscode());
  const auth = (): AdminAuth => ({ googleToken: currentGoogleToken(), passcode: passcode() });
  const verified = Boolean(status?.configured && status.identity);
  const canSend =
    matches && !busy && !checking && verified && (!showPasscode || admin.trim().length > 0);

  const signInWithGoogle = async () => {
    setSigningIn(true);
    setNote(null);
    try {
      await requestGoogleToken({
        scope: GOOGLE_SCOPES,
        prompt: status?.otherEmail ? "select_account" : "",
      });
      await recheck();
    } catch (error) {
      setNote({
        tone: "error",
        text: error instanceof Error ? error.message : "Google sign-in did not finish.",
      });
    } finally {
      setSigningIn(false);
    }
  };

  const afterAuth = (code: string) => {
    if (code === "admin_required") {
      clearAdminPasscode();
      if (secondFactor) setNeedAdmin(true);
      void recheck();
      return;
    }
    // Any other answer means the server accepted the admin proof (incl. a typed passcode).
    if (showPasscode && admin.trim()) {
      setAdminPasscode(admin.trim());
      setNeedAdmin(false);
    }
  };

  const run = async () => {
    if (!canSend) return;
    setBusy(true);
    setNote(null);
    try {
      const outcome = await target.remove(auth());
      afterAuth(outcome.code);
      if (outcome.ok) {
        onOpenChange(false);
        onDeleted(target, outcome);
        return;
      }
      if (outcome.code === "needs_cleanup") setNeedsCleanup(Boolean(target.cleanup));
      const uncertain = outcome.code === "unverified" || outcome.code === "not_found";
      if (uncertain) onUnsettled?.(target);
      setNote({
        tone: uncertain || outcome.code === "needs_cleanup" ? "warn" : "error",
        text:
          outcome.message +
          (outcome.retryAfterSeconds
            ? " Try again in about " + Math.ceil(outcome.retryAfterSeconds / 60) + " min."
            : ""),
      });
    } catch {
      setNote({
        tone: "warn",
        text: "Lost contact with the server, so it is not certain whether anything changed. Refresh the list before trying again.",
      });
      onUnsettled?.(target);
    } finally {
      setBusy(false);
    }
  };

  const runCleanup = async () => {
    if (!target.cleanup || !ack || !canSend) return;
    setBusy(true);
    setNote(null);
    try {
      const outcome = await target.cleanup(auth());
      afterAuth(outcome.ok ? "ok" : outcome.code);
      setNote({ tone: outcome.ok ? "info" : "error", text: outcome.message });
      if (outcome.ok) setAck(false);
    } catch {
      setNote({
        tone: "warn",
        text: "Lost contact with the server while removing old deployments. Refresh before trying again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const inputId = "delete-confirm-" + target.key.replace(/[^a-z0-9]/gi, "-");
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle size={18} className="shrink-0 text-destructive" aria-hidden="true" />
            Delete this {target.what} forever?
          </DialogTitle>
          <DialogDescription>
            This cannot be undone. Nothing is deleted until you type the exact name.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <dt className="text-muted-foreground">Provider</dt>
          <dd className="font-medium">{target.provider}</dd>
          <dt className="text-muted-foreground">Account</dt>
          <dd className="break-all font-medium">{target.account}</dd>
          <dt className="text-muted-foreground">
            {target.what[0]?.toUpperCase() + target.what.slice(1)}
          </dt>
          <dd className="break-all font-semibold">{target.confirmText}</dd>
        </dl>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {target.consequences.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div
          className="space-y-2 rounded-lg border border-border p-3 text-sm"
          aria-live="polite"
          aria-busy={checking}
        >
          {checking && !status ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
              Checking admin sign-in…
            </p>
          ) : status?.identity ? (
            <p className="flex items-start gap-2">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
              <span className="min-w-0 break-all">
                Signed in with {status.identity.via === "google" ? "Google" : "Cloudflare Access"}{" "}
                as <strong>{status.identity.email}</strong>
              </span>
            </p>
          ) : (
            <>
              <p className="text-muted-foreground">
                {status?.message ||
                  "Deleting needs a verified admin sign-in. Sign in with Google as an admin."}
              </p>
              {status?.configured && status.googleReady && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={signingIn || checking || busy}
                  onClick={() => void signInWithGoogle()}
                >
                  {signingIn && <LoaderCircle size={14} className="animate-spin" />}
                  {status.otherEmail ? "Use a different Google account" : "Sign in with Google"}
                </Button>
              )}
            </>
          )}
        </div>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run();
          }}
        >
          <div className="space-y-1.5">
            <label className="block text-sm" htmlFor={inputId}>
              Type{" "}
              <code className="break-all rounded bg-muted px-1.5 py-0.5 font-semibold">
                {target.confirmText}
              </code>{" "}
              to confirm
            </label>
            <Input
              id={inputId}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={busy}
              aria-invalid={typed.length > 0 && !matches}
            />
          </div>
          {showPasscode && verified && (
            <div className="space-y-1.5">
              <label className="block text-sm" htmlFor={inputId + "-admin"}>
                Admin passcode{" "}
                <span className="text-muted-foreground">(kept only until you close this tab)</span>
              </label>
              <Input
                id={inputId + "-admin"}
                type="password"
                value={admin}
                onChange={(event) => setAdmin(event.target.value)}
                autoComplete="off"
                disabled={busy}
              />
            </div>
          )}
          {note && (
            <p
              role="alert"
              className={"rounded-lg border px-3 py-2 text-sm " + NOTE_STYLE[note.tone]}
            >
              {note.text}
            </p>
          )}
          {needsCleanup && target.cleanup && (
            <div className="space-y-2 rounded-lg border border-warning/50 p-3">
              <p className="text-sm font-medium">Separate step: remove old deployments</p>
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={ack}
                  onCheckedChange={(v) => setAck(v === true)}
                  disabled={busy}
                  className="mt-0.5"
                />
                <span>
                  I understand up to 25 of the oldest deployments of {target.confirmText} will be
                  permanently removed. The live deployment is kept and the project is not deleted.
                </span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!ack || !canSend}
                onClick={() => void runCleanup()}
              >
                Remove old deployments
              </Button>
            </div>
          )}
          <DialogFooter className="gap-2 pt-1 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={!canSend}>
              {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {busy ? "Working…" : "Delete forever"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
