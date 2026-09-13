// GoogleSetupModal — one-time guided setup for direct Google OAuth.
// Lets the user paste their Google OAuth Client ID and shows the exact
// origin to whitelist in Google Cloud Console. Shared by CalendarPage,
// GoogleTasksPage and SettingsPage.

import { useState } from "react";
import { X, Copy, Check, ExternalLink, KeyRound, ShieldCheck } from "lucide-react";
import {
  getGoogleClientId,
  setGoogleClientId,
  hasGoogleClientId,
  getGoogleOrigin,
} from "@/lib/googleDirectAuth";

export function GoogleSetupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [value, setValue] = useState(() => getGoogleClientId());
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(hasGoogleClientId());
  const origin = getGoogleOrigin();

  if (!open) return null;

  const handleSave = () => {
    setGoogleClientId(value);
    setSaved(/\.apps\.googleusercontent\.com$/.test(value.trim()));
    // re-read so parent re-renders pick up the new state
    window.dispatchEvent(new Event("mc-google-client-id-changed"));
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
            <h3 className="text-sm font-bold text-foreground">Connect Google — one-time setup</h3>
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
            This app talks to Google directly from your browser — no third-party servers. To do
            that, Google needs an OAuth Client ID that authorizes{" "}
            <span className="font-semibold text-foreground">{origin}</span>. It takes about 3
            minutes, once.
          </p>

          <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2.5">
            <div className="text-[11px] font-semibold text-foreground">
              Steps in Google Cloud Console:
            </div>
            <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>
                Open{" "}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5"
                >
                  console.cloud.google.com → Credentials <ExternalLink size={9} />
                </a>
              </li>
              <li>
                Enable the <span className="text-foreground font-medium">Google Calendar API</span>{" "}
                and <span className="text-foreground font-medium">Google Tasks API</span> (APIs &
                Services → Library).
              </li>
              <li>
                OAuth consent screen → External → add your Google account as a Test user (or Publish
                the app).
              </li>
              <li>
                Create Credentials →{" "}
                <span className="text-foreground font-medium">OAuth client ID</span> → Web
                application.
              </li>
              <li>
                Under{" "}
                <span className="text-foreground font-medium">Authorized JavaScript origins</span>{" "}
                add:
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
                Copy the Client ID (ends in{" "}
                <span className="font-mono">.apps.googleusercontent.com</span>) and paste it below.
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
                setSaved(false);
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

          {saved && (
            <div className="flex items-center gap-1.5 text-[11px] text-green-600 dark:text-green-400">
              <ShieldCheck size={12} /> Google Client ID saved. Press Connect on the calendar.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-secondary"
          >
            {saved ? "Done" : "Cancel"}
          </button>
          <button
            onClick={handleSave}
            disabled={!value.trim()}
            className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Save Client ID
          </button>
        </div>
      </div>
    </div>
  );
}
