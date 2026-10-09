import { useEffect, useState } from 'react';
import { Cloud, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTasks } from '@/hooks/useTableData';
import { useGoogleSyncStatus } from '@/hooks/useGoogleSyncStatus';
import { getCloudStatus, getCloudError, getCloudUserId, getLastCloudSync, getPendingCloudCount,
  onCloudStatus, onDirtyRecordsChange, signInToCloud, forceCloudSync, repairStaleCloudJournal } from '@/lib/cloudSync';
import { requestGoogleSync } from '@/lib/googleSync';
import type { GoogleSyncStatus } from '@/lib/googleSyncState';

function snapshot() { return { status: getCloudStatus(), error: getCloudError(), email: getCloudUserId(), at: getLastCloudSync(), pending: getPendingCloudCount() }; }

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** One honest line about Google Tasks and Calendar: what state it is in, and what it just did. */
function googleLine(google: GoogleSyncStatus): string {
  switch (google.state) {
    case 'syncing':
      return 'Google Tasks & Calendar · syncing...';
    case 'reconnect':
      return 'Google Tasks & Calendar · sign-in expired, reconnect to keep syncing';
    case 'error':
      return `Google Tasks & Calendar · will retry${google.lastError ? ` (${google.lastError})` : ''}`;
    case 'idle': {
      const c = google.lastCounts;
      const changes = c ? c.tasksPushed + c.tasksPulled + c.tasksImported + c.tasksDeleted + c.eventsPushed : 0;
      return `Google Tasks & Calendar · up to date${google.lastSyncAt ? ` at ${time(google.lastSyncAt)}` : ''}${changes ? ` · ${changes} change${changes === 1 ? '' : 's'} applied` : ''}`;
    }
    default:
      return 'Google Tasks & Calendar · not connected on this device';
  }
}

export default function CrossDeviceSyncBar() {
  const [sync, setSync] = useState(snapshot);
  const [busy, setBusy] = useState(false);
  const tasks = useTasks();
  const google = useGoogleSyncStatus();
  useEffect(() => {
    const update = () => setSync(snapshot());
    const offStatus = onCloudStatus(update), offDirty = onDirtyRecordsChange(update);
    return () => { offStatus(); offDirty(); };
  }, []);

  useEffect(() => {
    if (!/pending .* record is missing locally/i.test(sync.error || "")) return;
    let cancelled = false;
    void (async () => {
      const repaired = await repairStaleCloudJournal();
      if (cancelled || !repaired) return;
      const result = await forceCloudSync();
      if (!cancelled && result.ok) {
        toast.success("Sync queue repaired", {
          description: `Removed ${repaired} stale queue entr${repaired === 1 ? "y" : "ies"} and resumed cloud synchronization.`,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sync.error]);
  const connect = sync.status === 'signed-out' || !sync.email || /expired|session|reconnect|not connected/i.test(sync.error || '');
  // The one-hour Google sign-in ran out. Reconnecting needs a click, so it is offered, not forced.
  const reconnectGoogle = !connect && google.state === 'reconnect';
  const act = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (connect) await signInToCloud();
      else if (reconnectGoogle) {
        const { signIn } = await import('@/lib/googleTasks');
        await signIn();
      } else {
        const result = await forceCloudSync();
        if (!result.ok) throw new Error(result.error);
      }
      // Tasks and Calendar are synced in the same press, so one button brings everything up to date.
      await requestGoogleSync({ reason: 'manual' });
      toast.success('Everything is up to date', {
        description: 'Use this same Google account and app on your other device.',
      });
    } catch (error) { toast.error('Synchronization needs attention', { description: error instanceof Error ? error.message : 'Your local tasks have been preserved.' }); }
    finally { setBusy(false); setSync(snapshot()); }
  };
  const applyHeld = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await requestGoogleSync({ reason: 'manual', confirmDeletions: true });
      toast.success('Deletions applied', { description: 'They are in Trash for 30 days if you change your mind.' });
    } finally { setBusy(false); }
  };
  const label = sync.status === 'synced' && !sync.pending ? 'Cloud confirmed' : sync.status === 'signed-out' ? 'This device only' : sync.status === 'error' ? 'Sync needs attention' : sync.status === 'offline' ? 'Offline - saved locally' : 'Synchronizing';
  return (
    <section
      aria-label="Cross-device synchronization"
      className="mc20-syncbar"
      data-state={sync.status}
      data-connect={connect ? "true" : "false"}
    >
      <div className="mc20-syncbar-inner">
        <div className="mc20-sync-status">
          <span className="mc20-sync-dot" aria-hidden />
          <Cloud size={14} className="mc20-sync-icon" />
          <div className="mc20-sync-copy">
            <div className="mc20-sync-title" role="status">
              {label}
              <span> · {tasks.length} tasks · {sync.pending} pending</span>
            </div>
            <div className="mc20-sync-meta">
              {sync.email || "Connect the same Google account on mobile and desktop."}
              {sync.at
                ? ` · Last confirmed ${time(sync.at)}`
                : ""}
            </div>
            {(!connect || google.state !== 'disconnected') && (
              <div className="mc20-sync-meta" data-google-state={google.state}>
                {googleLine(google)}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void act()}
          disabled={busy || sync.status === "connecting"}
          className="mc20-sync-action"
        >
          <RefreshCw size={13} className={busy || sync.status === "syncing" || google.state === "syncing" ? "animate-spin" : ""} />
          {busy ? "Syncing..." : connect ? "Connect Google" : reconnectGoogle ? "Reconnect Google" : "Sync now"}
        </button>
      </div>

      {google.heldDeletions > 0 && (
        <p role="alert" className="mc20-sync-error">
          {google.heldDeletions} tasks are missing from Google and were kept here, because that many at once can be a bad response.{' '}
          <button type="button" className="underline" onClick={() => void applyHeld()}>
            Move them to Trash
          </button>
        </p>
      )}

      {sync.error && (
        <p role="alert" className="mc20-sync-error">
          {sync.error}
        </p>
      )}
    </section>
  );
}
