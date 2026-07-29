import { useEffect, useState } from 'react';
import { Cloud, CloudOff, Loader2, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  onCloudStatus, signInToCloud, forceCloudSync, getLastCloudSync,
  type CloudStatus,
} from '@/lib/cloudSync';

function label(status: CloudStatus) {
  switch (status) {
    case 'synced': return 'Backed up';
    case 'syncing': return 'Backing up…';
    case 'connecting': return 'Connecting…';
    case 'offline': return 'Offline';
    case 'error': return 'Backup error';
    default: return 'Not backed up';
  }
}

/** Compact badge for the desktop status bar. */
export function CloudBackupBadge() {
  const [status, setStatus] = useState<CloudStatus>('signed-out');
  useEffect(() => onCloudStatus((s) => setStatus(s)), []);

  const tone =
    status === 'synced' ? 'text-success/80'
      : status === 'error' ? 'text-destructive/80'
        : status === 'signed-out' ? 'text-muted-foreground/60'
          : 'text-amber-500/80';

  return (
    <button
      type="button"
      onClick={() => (status === 'signed-out' ? void signInToCloud() : void forceCloudSync())}
      className={`flex items-center gap-1 transition-colors hover:text-foreground ${tone}`}
      title={status === 'signed-out' ? 'Sign in to back up your data' : `Last sync: ${getLastCloudSync() ?? '—'}`}
    >
      {status === 'syncing' || status === 'connecting'
        ? <Loader2 size={10} className="animate-spin" />
        : status === 'synced' ? <ShieldCheck size={10} />
          : status === 'signed-out' ? <CloudOff size={10} />
            : <Cloud size={10} />}
      Cloud · {label(status)}
    </button>
  );
}

/** Prominent, mobile-friendly banner asking the user to enable cloud backup. */
export default function CloudBackupBanner() {
  const [status, setStatus] = useState<CloudStatus>('signed-out');
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => onCloudStatus((s, e) => { setStatus(s); setErr(e); }), []);

  if (status !== 'signed-out' && status !== 'error') return null;

  const isError = status === 'error';

  return (
    <div className={`enterprise-panel mb-4 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${isError ? 'border-destructive/40' : 'border-primary/30'}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-xl p-2 ${isError ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>
          {isError ? <AlertTriangle size={16} /> : <CloudOff size={16} />}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {isError ? 'Cloud backup problem' : 'Your data is only on this device'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isError
              ? (err ?? 'Sync failed. Try again.')
              : 'Sign in to back everything up automatically and restore it on any device — even after clearing your browser.'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => (isError ? void forceCloudSync() : void signInToCloud())}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        {isError ? <><RefreshCw size={14} /> Retry sync</> : <><Cloud size={14} /> Turn on cloud backup</>}
      </button>
    </div>
  );
}
