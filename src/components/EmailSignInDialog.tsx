// ─── EmailSignInDialog — the OAuth-free backup path ──────────────────────────
// Google OAuth is broken server-side (missing client secret in Supabase).
// Email code sign-in needs zero server configuration and restores the same
// account-scoped cloud backup. This dialog is the working fallback.

import { useEffect, useState } from 'react';
import { Cloud, Loader2, Mail, ShieldCheck, X } from 'lucide-react';
import { requestEmailCode, verifyEmailCode, onCloudStatus } from '@/lib/cloudSync';

export default function EmailSignInDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => onCloudStatus((s) => { if (s === 'synced') onClose(); }), [onClose]);

  if (!open) return null;

  const requestCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email address'); return; }
    setBusy(true); setError(null);
    const r = await requestEmailCode(email);
    setBusy(false);
    if (r.ok) { setStage('code'); setSent(true); }
    else setError(r.error ?? 'Could not send the code');
  };

  const verify = async () => {
    if (code.trim().length < 6) { setError('Enter the 6-digit code from the email'); return; }
    setBusy(true); setError(null);
    const r = await verifyEmailCode(email, code);
    setBusy(false);
    if (r.ok) onClose();
    else setError(r.error ?? 'That code did not work');
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-md" />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-border/60 bg-card shadow-[var(--shadow-xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-transparent to-transparent p-6 pb-5">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                <Cloud size={18} />
              </div>
              <h2 className="font-display mt-3 text-[19px] font-extrabold tracking-tight text-foreground">
                Turn on cloud backup
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                Your data lives only on this device right now. Sign in and everything syncs privately —
                restore on any device, any time.
              </p>
            </div>
            <button onClick={onClose} className="rounded-xl p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-3 p-6 pt-4">
          {stage === 'email' && (
            <>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Email address
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 focus-within:border-primary/50">
                <Mail size={15} className="shrink-0 text-muted-foreground" />
                <input
                  autoFocus
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') requestCode(); }}
                  placeholder="you@example.com"
                  className="h-11 min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50"
                />
              </div>
              <button
                onClick={requestCode}
                disabled={busy}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[13px] font-bold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                {busy ? 'Sending code…' : 'Send sign-in code'}
              </button>
              <p className="text-center text-[10.5px] leading-relaxed text-muted-foreground/70">
                Google sign-in is temporarily unavailable on this deployment — email codes work the same.
              </p>
            </>
          )}

          {stage === 'code' && (
            <>
              <p className="text-[12px] text-muted-foreground">
                {sent ? 'Code sent to ' : 'Enter the code sent to '}
                <strong className="text-foreground">{email}</strong>
              </p>
              <input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') verify(); }}
                placeholder="••••••"
                className="h-13 w-full rounded-2xl border border-border/70 bg-background px-4 text-center font-mono text-[22px] font-bold tracking-[0.4em] text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary/50"
                style={{ height: 52 }}
              />
              {error && <p className="text-[11px] font-semibold text-destructive">{error}</p>}
              <button
                onClick={verify}
                disabled={busy}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[13px] font-bold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                {busy ? 'Verifying…' : 'Verify & start backup'}
              </button>
              <button
                onClick={() => { setStage('email'); setCode(''); setError(null); }}
                className="w-full text-center text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
              >
                Use a different email
              </button>
            </>
          )}

          {stage === 'email' && error && <p className="text-[11px] font-semibold text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
