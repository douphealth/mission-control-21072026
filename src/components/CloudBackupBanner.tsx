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
    <div className={`enterprise-panel mb-3 flex items-center gap-3 rounded-2xl border p-3 sm:mb-4 sm:p-4 ${isError ? 'border-destructive/40' : 'border-primary/30'}`}>
      <div className={`shrink-0 rounded-xl p-2 ${isError ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>
        {isError ? <AlertTriangle size={16} /> : <CloudOff size={16} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground sm:text-sm">
          {isError ? 'Cloud backup problem' : 'Data is only on this device'}
        </p>
        <p className="line-clamp-2 text-[11px] text-muted-foreground sm:text-xs">
          {isError
            ? (err ?? 'Sync failed. Try again.')
            : 'Sign in to back up and restore on any device.'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => (isError ? void forceCloudSync() : void signInToCloud())}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground transition-opacity active:opacity-80 sm:px-4 sm:text-sm"
      >
        {isError ? <><RefreshCw size={14} /> <span className="hidden sm:inline">Retry sync</span></> : <><Cloud size={14} /> <span className="hidden sm:inline">Turn on cloud backup</span><span className="sm:hidden">Back up</span></>}
      </button>
    </div>
  );
}

