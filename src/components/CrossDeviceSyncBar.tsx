import { useEffect, useState } from 'react';
import { Cloud, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTasks } from '@/hooks/useTableData';
import { getCloudStatus, getCloudError, getCloudUserId, getLastCloudSync, getPendingCloudCount,
  onCloudStatus, onDirtyRecordsChange, signInToCloud, forceCloudSync, repairStaleCloudJournal } from '@/lib/cloudSync';

function snapshot() { return { status: getCloudStatus(), error: getCloudError(), email: getCloudUserId(), at: getLastCloudSync(), pending: getPendingCloudCount() }; }
export default function CrossDeviceSyncBar() {
  const [sync, setSync] = useState(snapshot);
  const [busy, setBusy] = useState(false);
  const tasks = useTasks();
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
  const act = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (connect) await signInToCloud();
      else {
        const result = await forceCloudSync();
        if (!result.ok) throw new Error(result.error);
        toast.success('Cloud synchronization confirmed', {
          description: result.repairedQueueEntries
            ? `Repaired ${result.repairedQueueEntries} stale queue entr${result.repairedQueueEntries === 1 ? 'y' : 'ies'} and continued syncing normally.`
            : 'Use this same Google account and app on your other device.',
        });
        return;
      }
      toast.success('Cloud synchronization confirmed', {
        description: 'Use this same Google account and app on your other device.',
      });
    } catch (error) { toast.error('Synchronization needs attention', { description: error instanceof Error ? error.message : 'Your local tasks have been preserved.' }); }
    finally { setBusy(false); setSync(snapshot()); }
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
                ? ` · Last confirmed ${new Date(sync.at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : ""}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void act()}
          disabled={busy || sync.status === "connecting"}
          className="mc20-sync-action"
        >
          <RefreshCw size={13} className={busy || sync.status === "syncing" ? "animate-spin" : ""} />
          {busy ? "Syncing..." : connect ? "Connect Google" : "Sync now"}
        </button>
      </div>

      {sync.error && (
        <p role="alert" className="mc20-sync-error">
          {sync.error}
        </p>
      )}
    </section>
  );
}
