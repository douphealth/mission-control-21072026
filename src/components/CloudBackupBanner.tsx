import { useEffect, useState } from "react";
import { Cloud, CloudOff, Loader2, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";
import {
  onCloudStatus,
  signInToCloud,
  forceCloudSync,
  getLastCloudSync,
  type CloudStatus,
} from "@/lib/cloudSync";
import EmailSignInDialog from "./EmailSignInDialog";

function label(status: CloudStatus) {
  switch (status) {
    case "synced":
      return "Backed up";
    case "syncing":
      return "Backing up…";
    case "connecting":
      return "Connecting…";
    case "offline":
      return "Offline";
    case "error":
      return "Backup error";
    default:
      return "Not backed up";
  }
}

/** Compact badge for the desktop status bar. */
export function CloudBackupBadge() {
  const [status, setStatus] = useState<CloudStatus>("signed-out");
  useEffect(() => onCloudStatus((s) => setStatus(s)), []);

  const tone =
    status === "synced"
      ? "text-success/80"
      : status === "error"
        ? "text-destructive/80"
        : status === "signed-out"
          ? "text-muted-foreground/60"
          : "text-amber-500/80";

  return (
    <button
      type="button"
      onClick={() => (status === "signed-out" ? void signInToCloud() : void forceCloudSync())}
      className={`flex items-center gap-1 transition-colors hover:text-foreground ${tone}`}
      title={
        status === "signed-out"
          ? "Sign in to back up your data"
          : `Last sync: ${getLastCloudSync() ?? "—"}`
      }
    >
      {status === "syncing" || status === "connecting" ? (
        <Loader2 size={10} className="animate-spin" />
      ) : status === "synced" ? (
        <ShieldCheck size={10} />
      ) : status === "signed-out" ? (
        <CloudOff size={10} />
      ) : (
        <Cloud size={10} />
      )}
      Cloud · {label(status)}
    </button>
  );
}

/** Prominent, mobile-friendly banner asking the user to enable cloud backup. */
export default function CloudBackupBanner() {
  const [status, setStatus] = useState<CloudStatus>("signed-out");
  const [err, setErr] = useState<string | null>(null);
  const [emailDialog, setEmailDialog] = useState(false);
  useEffect(
    () =>
      onCloudStatus((s, e) => {
        setStatus(s);
        setErr(e);
      }),
    [],
  );

  if (status === "synced" || status === "syncing") return null;

  // Google OAuth is unconfigured on the backend (missing client secret) —
  // route the user straight to the email-code flow that works.
  const oauthBroken = /GOOGLE_OAUTH_UNCONFIGURED|OAuth secret|Unsupported provider/i.test(
    err ?? "",
  );

  const start = () => {
    if (oauthBroken) {
      setEmailDialog(true);
      return;
    }
    // Try Google first; the catch in signInToCloud flips the banner into
    // the oauthBroken state, and the next click opens email sign-in.
    void signInToCloud().then(() => {
      // signInToCloud swallows errors into status — re-read current error
      // from the store via the callback we already have is not possible
      // synchronously; instead poll once.
    });
  };

  return (
    <>
      <div
        className={`enterprise-panel mb-3 flex items-center gap-3 rounded-2xl border p-3 sm:mb-4 sm:p-4 ${status === "error" ? "border-destructive/40" : "border-primary/30"}`}
      >
        <div
          className={`shrink-0 rounded-xl p-2 ${status === "error" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}
        >
          {status === "error" ? <AlertTriangle size={16} /> : <CloudOff size={16} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground sm:text-sm">
            {status === "error" ? "Cloud backup problem" : "Data is only on this device"}
          </p>
          <p className="line-clamp-2 text-[11px] text-muted-foreground sm:text-xs">
            {status === "error"
              ? oauthBroken
                ? "Google sign-in is not configured on this deployment yet. Use the email code instead — same private backup."
                : (err ?? "Sync failed. Try again.")
              : "Sign in to back up and restore on any device."}
          </p>
        </div>
        <button
          type="button"
          onClick={
            status === "error" && !oauthBroken
              ? () => void forceCloudSync()
              : () => setEmailDialog(true)
          }
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground transition-opacity active:opacity-80 sm:px-4 sm:text-sm"
        >
          {status === "error" && !oauthBroken ? (
            <>
              <RefreshCw size={14} /> <span className="hidden sm:inline">Retry sync</span>
            </>
          ) : (
            <>
              <Cloud size={14} /> <span className="hidden sm:inline">Back up with email</span>
              <span className="sm:hidden">Back up</span>
            </>
          )}
        </button>
      </div>
      <EmailSignInDialog open={emailDialog} onClose={() => setEmailDialog(false)} />
    </>
  );
}
