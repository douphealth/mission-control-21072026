import { useLiveQuery } from 'dexie-react-hooks';
import { Activity, Check, Clock3, Play, ShieldAlert, X } from 'lucide-react';
import { automationDb } from '@/lib/automationDb';
import { buildDefaultRoutines } from '@/lib/defaultRoutines';
import { runDueAutomations } from '@/lib/automationScheduler';
import { checkAllIntegrations } from '@/lib/integrationRegistry';
import { toast } from 'sonner';

export default function AutomationCenterPage() {
  const automations = useLiveQuery(() => automationDb.automations.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const runs = useLiveQuery(() => automationDb.runs.orderBy('scheduledFor').reverse().limit(20).toArray(), []) ?? [];
  const approvals = useLiveQuery(() => automationDb.approvals.where('status').equals('pending').toArray(), []) ?? [];
  const health = useLiveQuery(() => automationDb.integrationHealth.toArray(), []) ?? [];

  const installRoutines = async () => {
    await automationDb.automations.bulkPut(buildDefaultRoutines());
    toast.success('Default routines installed as drafts');
  };

  const runNow = async () => {
    const results = await runDueAutomations();
    toast.success(`Scheduler checked ${results.length} due automation(s)`);
  };

  const resolveApproval = async (id: string, approved: boolean) => {
    await automationDb.approvals.update(id, {
      status: approved ? 'approved' : 'rejected',
      resolvedAt: new Date().toISOString(),
    });
    toast.success(approved ? 'Action approved' : 'Action rejected');
  };

  const enable = async (id: string, active: boolean) => {
    await automationDb.automations.update(id, {
      status: active ? 'active' : 'paused',
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="text-primary" /> Automation Center</h1>
          <p className="text-sm text-muted-foreground">Schedules, approvals, execution history and integration health in one control plane.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={installRoutines} className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-secondary">Install routines</button>
          <button onClick={runNow} className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"><Play size={14} className="inline mr-1" />Run due</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Automations', automations.length],
          ['Pending approvals', approvals.length],
          ['Recent failures', runs.filter(run => run.status === 'failed').length],
          ['Healthy integrations', health.filter(item => item.status === 'healthy').length],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      {approvals.length > 0 && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><ShieldAlert size={17} /> Approval inbox</h2>
          {approvals.map(item => (
            <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="font-medium">{item.summary}</div><div className="text-xs text-muted-foreground">{item.actionType}</div></div>
              <div className="flex gap-2">
                <button onClick={() => resolveApproval(item.id, false)} className="rounded-lg border border-border px-3 py-1.5 text-xs"><X size={13} className="inline mr-1" />Reject</button>
                <button onClick={() => resolveApproval(item.id, true)} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground"><Check size={13} className="inline mr-1" />Approve</button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">Automation definitions</h2>
        {automations.length === 0 ? <p className="text-sm text-muted-foreground">No routines installed.</p> : automations.map(item => (
          <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-xs text-muted-foreground">{item.schedule} · {item.timezone} · {item.actionType}</div>
            </div>
            <button onClick={() => enable(item.id, item.status !== 'active')} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${item.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-secondary text-muted-foreground'}`}>
              {item.status === 'active' ? 'Active' : 'Enable'}
            </button>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><Clock3 size={16} /> Recent runs</h2>
        {runs.length === 0 ? <p className="text-sm text-muted-foreground">No execution history yet.</p> : runs.map(run => (
          <div key={run.id} className="grid grid-cols-1 gap-1 rounded-xl border border-border/60 p-3 text-sm sm:grid-cols-[1fr_auto_auto]">
            <span className="font-medium">{run.automationId}</span>
            <span className="text-muted-foreground">{new Date(run.scheduledFor).toLocaleString()}</span>
            <span className={run.status === 'failed' ? 'text-destructive' : run.status === 'succeeded' ? 'text-emerald-600' : 'text-muted-foreground'}>{run.status}</span>
            {run.error && <span className="sm:col-span-3 text-xs text-destructive">{run.error}</span>}
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Integration health</h2><button onClick={() => void checkAllIntegrations()} className="text-xs text-primary">Check all</button></div>
        {health.length === 0 ? <p className="text-sm text-muted-foreground">No configured adapters have reported health yet.</p> : health.map(item => (
          <div key={item.id} className="flex items-center justify-between rounded-xl border border-border/60 p-3 text-sm"><span>{item.integration}</span><span>{item.status}</span></div>
        ))}
      </section>
    </div>
  );
}
