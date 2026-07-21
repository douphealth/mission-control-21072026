import { forwardRef, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Database, RefreshCw, ServerCrash } from 'lucide-react';
import { getSupabaseSyncDiagnostics, onSyncComplete, type SyncDiagnostics } from '@/lib/supabase';

function formatTime(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

const SupabaseSyncConsole = forwardRef<HTMLElement>(function SupabaseSyncConsole(_props, ref) {
  const [diagnostics, setDiagnostics] = useState<SyncDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setDiagnostics(await getSupabaseSyncDiagnostics());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(refresh, 60000);
    const unsubscribe = onSyncComplete(() => void refresh());
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    return () => {
      window.clearInterval(interval);
      unsubscribe();
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
    };
  }, []);

  const schemaSummary = useMemo(() => {
    if (!diagnostics) return { available: 0, missing: 0 };
    const values = Object.values(diagnostics.availableTables);
    return { available: values.filter(Boolean).length, missing: values.filter((value) => !value).length };
  }, [diagnostics]);

  return (
    <section ref={ref} className="border border-border/40 bg-card/70 p-4 sm:p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Database size={18} className="text-primary" /> Supabase sync status console
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Schema diagnostics, queue depth, and last sync signal.</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-60"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="border border-border/30 bg-background/40 p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Last sync</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground"><Clock3 size={14} /> {formatTime(diagnostics?.lastSyncAt ?? null)}</div>
        </div>
        <div className="border border-border/30 bg-background/40 p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Queued changes</div>
          <div className="mt-1 text-sm font-medium text-foreground">{diagnostics?.queuedChanges ?? '—'} local records</div>
        </div>
        <div className="border border-border/30 bg-background/40 p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Schema health</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
            {schemaSummary.missing ? <AlertTriangle size={14} className="text-destructive" /> : <CheckCircle2 size={14} className="text-success" />}
            {schemaSummary.available}/{schemaSummary.available + schemaSummary.missing || 0} tables available
          </div>
        </div>
      </div>

      {diagnostics && !diagnostics.schemaReady && (
        <div className="border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-destructive">
            <AlertTriangle size={14} /> {diagnostics.schemaErrors.some((error) => error.table === 'connection') ? 'Sync is blocked because the cloud connection is failing.' : 'Sync is blocked until the Supabase schema is created.'}
          </div>
          {diagnostics.schemaErrors.some((error) => error.table === 'connection') ? (
            <div className="mt-2">Reconnect with a valid project URL + anon key, or disconnect cloud sync to keep this device local-only.</div>
          ) : (
            <div className="mt-2">
              Missing tables: <span className="font-mono text-foreground">{diagnostics.missingTables.join(', ')}</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {diagnostics?.schemaErrors.length ? <ServerCrash size={14} className="text-destructive" /> : <CheckCircle2 size={14} className="text-success" />}
          Exact schema-level errors
        </div>
        <div className="max-h-56 overflow-auto border border-border/30 bg-background/50">
          {diagnostics?.schemaErrors.length ? diagnostics.schemaErrors.map((error) => (
            <div key={`${error.table}-${error.checkedAt}`} className="border-b border-border/20 p-3 text-xs last:border-b-0">
              <div className="font-mono text-foreground">{error.table} · {error.code || 'UNKNOWN'}</div>
              <div className="mt-1 text-destructive">{error.message}</div>
              {(error.details || error.hint) && <div className="mt-1 text-muted-foreground">{error.details || error.hint}</div>}
            </div>
          )) : (
            <div className="p-3 text-xs text-muted-foreground">No schema errors detected.</div>
          )}
        </div>
      </div>
    </section>
  );
});

export default SupabaseSyncConsole;