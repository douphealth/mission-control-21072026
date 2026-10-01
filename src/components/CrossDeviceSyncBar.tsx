import { useEffect, useState } from 'react';
import { Cloud, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTasks } from '@/hooks/useTableData';
import { getCloudStatus, getCloudError, getCloudUserId, getLastCloudSync, getPendingCloudCount,
  onCloudStatus, onDirtyRecordsChange, signInToCloud, forceCloudSync } from '@/lib/cloudSync';

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
  const connect = sync.status === 'signed-out' || !sync.email || /expired|session|reconnect|not connected/i.test(sync.error || '');
  const act = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (connect) await signInToCloud();
      else { const result = await forceCloudSync(); if (!result.ok) throw new Error(result.error); }
      toast.success('Cloud synchronization confirmed', { description: 'Use this same Google account and app on your other device.' });
    } catch (error) { toast.error('Synchronization needs attention', { description: error instanceof Error ? error.message : 'Your local tasks have been preserved.' }); }
    finally { setBusy(false); setSync(snapshot()); }
  };
  const label = sync.status === 'synced' && !sync.pending ? 'Cloud confirmed' : sync.status === 'signed-out' ? 'This device only' : sync.status === 'error' ? 'Sync needs attention' : sync.status === 'offline' ? 'Offline - saved locally' : 'Synchronizing';
  return <section aria-label="Cross-device synchronization" className="shrink-0 border-b border-border/50 bg-card px-3 py-2 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-start gap-2"><Cloud size={16} className="mt-0.5 shrink-0 text-primary" /><div className="min-w-0">
        <div className="text-xs font-semibold" role="status">{label} <span className="font-normal text-muted-foreground"> · {tasks.length} tasks on this device · {sync.pending} pending</span></div>
        <div className="break-all text-[11px] text-muted-foreground">{sync.email || 'Connect the same Google account on mobile and desktop.'}{sync.at ? ` · Last confirmed ${new Date(sync.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</div>
      </div></div>
      <button type="button" onClick={() => void act()} disabled={busy || sync.status === 'connecting'} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50"><RefreshCw size={14} className={busy || sync.status === 'syncing' ? 'animate-spin' : ''} />{busy ? 'Syncing...' : connect ? 'Connect Google' : 'Sync now'}</button>
    </div>
    {sync.error && <p role="alert" className="mt-1 break-words text-[11px] text-warning">{sync.error}</p>}
  </section>;
}
