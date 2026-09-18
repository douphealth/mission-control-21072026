// GoogleSetupModal — one-time guided setup for direct Google OAuth.
// Lets the user paste their Google OAuth Client ID and shows the exact
// origin to whitelist in Google Cloud Console. Shared by CalendarPage,
// GoogleTasksPage and SettingsPage.

import { useEffect, useState } from "react";
import { X, Copy, Check, ExternalLink, KeyRound, Loader2 } from "lucide-react";
import {
  getGoogleClientId,
  setGoogleClientId,
  hasGoogleClientId,
  getGoogleOrigin,
} from "@/lib/googleDirectAuth";

type GoogleSetupModalProps = {
  open: boolean;
  onClose: () => void;
  onConnect?: () => Promise<void>;
};

export function GoogleSetupModal({ open, onClose, onConnect }: GoogleSetupModalProps) {
  const [value, setValue] = useState(() => getGoogleClientId());
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const origin = getGoogleOrigin();

  useEffect(() => {
    if (!open) return;
    setValue(getGoogleClientId());
    setError(null);
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    const valid = /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(value.trim());
    if (!valid) {
      setError("Paste the Client ID ending in .apps.googleusercontent.com");
      return;
    }
    setGoogleClientId(value);
    window.dispatchEvent(new Event("mc-google-client-id-changed"));
    if (!onConnect) {
      onClose();
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      await onConnect();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google connection failed. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  const copyOrigin = async () => {
    try {
      await navigator.clipboard.writeText(origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-primary" />
             <h3 className="text-sm font-bold text-foreground">Connect Google once</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Google requires this one-time identity for a standalone app. After this, one Google
            account selection connects Calendar, Tasks, and private backup.
          </p>

          <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2.5">
            <ol className="text-xs text-muted-foreground space-y-3 leading-relaxed">
              <li>
                <span className="font-bold text-foreground">1. Open Google setup.</span>{" "}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5"
                >
                  Open Credentials <ExternalLink size={10} />
                </a>
                . Enable Calendar API, Tasks API, and Drive API. Add your Google account as a test
                user on the OAuth consent screen.
              </li>
              <li>
                <span className="font-bold text-foreground">2. Create an OAuth Client ID.</span>{" "}
                Choose <span className="font-semibold text-foreground">Web application</span>, then
                add this exact address under Authorized JavaScript origins:
                <button
                  onClick={copyOrigin}
                  className="mt-1.5 w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border font-mono text-[10px] text-foreground hover:border-primary/40 transition-colors"
                >
                  <span className="truncate">{origin}</span>
                  {copied ? (
                    <Check size={11} className="text-green-500 shrink-0" />
                  ) : (
                    <Copy size={11} className="text-muted-foreground shrink-0" />
                  )}
                </button>
              </li>
              <li>
                <span className="font-bold text-foreground">3. Paste the Client ID below.</span> The
                Google account window opens automatically.
              </li>
            </ol>
          </div>

          <div className="space-y-1.5">
            <label
              className="text-[11px] font-semibold text-foreground"
              htmlFor="mc-google-client-id"
            >
              Google OAuth Client ID
            </label>
            <input
              id="mc-google-client-id"
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              placeholder="123456789-abcdefg.apps.googleusercontent.com"
              className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {value.trim() && !/\.apps\.googleusercontent\.com$/.test(value.trim()) && (
              <div className="text-[10px] text-amber-500">
                Client IDs end in .apps.googleusercontent.com — double-check what you pasted.
              </div>
            )}
          </div>

          {error && (
            <div className="text-xs font-medium text-destructive" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!value.trim() || connecting}
            className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {connecting && <Loader2 size={13} className="mr-1.5 inline animate-spin" />}
            {connecting ? "Connecting…" : onConnect ? "Save & Connect Google" : "Save Client ID"}
          </button>
        </div>
      </div>
    </div>
  );
}
