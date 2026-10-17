import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { SavedSchedule } from "@/hooks/useFamilySchedule";
import { getCloudStatus, getCloudUserId, getCloudError, getPendingCloudCount,
  getLastCloudSync, getRecordSyncState, onCloudStatus, onDirtyRecordsChange,
  forceCloudSync, signInToCloud } from "@/lib/cloudSync";

function current() {
  return { state: getCloudStatus(), email: getCloudUserId(), error: getCloudError(),
    pending: getPendingCloudCount(), last: getLastCloudSync() };
}
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50";
export default function FamilySyncStatus({ schedules, loading }: { schedules: SavedSchedule[]; loading: boolean }) {
  const [sync, setSync] = useState(current);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const update = () => setSync(current());
    const removeStatus = onCloudStatus(update);
    const removeDirty = onDirtyRecordsChange(update);
    return () => { removeStatus(); removeDirty(); };
  }, []);
  const entries = schedules.map(row => getRecordSyncState("notes", row.id));
  const cloudConfirmed = entries.filter(state => state === "saved").length;
  const localOnly = entries.filter(state => state === "local-only").length;
  const pending = entries.filter(state => state === "pending" || state === "failed").length;
  const needsConnection = sync.state === "signed-out" ||
    (sync.state === "error" && (!sync.email || /expired|reconnect|session|scope/i.test(sync.error || "")));
  async function action() {
    if (busy) return;
    setBusy(true);
    try {
      if (needsConnection) await signInToCloud();
      else {
        const result = await forceCloudSync();
        if (!result.ok) throw new Error(result.error || "Google Drive did not confirm your records.");
      }
      setSync(current());
      toast.success("Family timetable sync confirmed", {
        description: "Open this app with the same Google account on your other device and sync there too.",
      });
    } catch (error) {
      setSync(current());
      toast.error("Family schedules have not synced", {
        description: error instanceof Error ? error.message : "Local schedules remain saved. Retry without clearing browser data.",
      });
    } finally { setBusy(false); }
  }
  const confirmed = sync.state === "synced" && pending === 0 && localOnly === 0 &&
    (!schedules.length || cloudConfirmed === schedules.length);
  const title = needsConnection ? "This device only — connect Google Drive" :
    sync.state === "offline" ? "Offline — schedules saved locally" :
    confirmed ? "Family timetable cloud confirmed" :
    sync.state === "error" ? "Family timetable sync needs attention" :
    "Family timetable synchronization pending";
  const description = needsConnection
    ? "Your family schedule is not automatically available on other devices. Connect the SAME Google account on the device containing the original schedule first."
    : confirmed
      ? "This device has finished checking the latest Drive records. Use the same connected Google account and Sync now on your other device."
      : "Some records are still pending or could not be verified. The copy on this device has not been deleted.";
  return <section className="rounded-2xl border border-primary/20 bg-card p-4 sm:p-5 fs-no-print" aria-label="Family schedule synchronization" data-testid="family-cloud-status">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          {needsConnection ? <CloudOff size={19} /> : confirmed ? <ShieldCheck size={19} /> : sync.state === "error" ? <AlertTriangle size={19} /> : <Cloud size={19} />}
        </span>
        <div className="min-w-0"><h2 className="text-sm font-bold">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
          <p className="mt-2 break-words text-xs text-muted-foreground">{loading ? "Loading local records..." : `${schedules.length} local schedules · ${cloudConfirmed} cloud-confirmed · ${pending} pending · ${localOnly} device-only`}</p>
          {sync.email && <p className="mt-1 break-all text-xs text-muted-foreground">Google account: {sync.email}</p>}
          {sync.last && <p className="mt-1 text-xs text-muted-foreground">Last successful Drive sync: {new Date(sync.last).toLocaleString()}</p>}
          {sync.error && sync.state === "error" && <p role="alert" className="mt-2 break-words text-xs text-destructive">{sync.error}</p>}
        </div>
      </div>
      <button type="button" className={button} disabled={busy || sync.state === "connecting" || loading} onClick={() => void action()}>
        <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
        {busy ? "Synchronizing..." : needsConnection ? "Connect Google" : "Sync schedules now"}
      </button>
    </div>
  </section>;
}
