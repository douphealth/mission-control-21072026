import { AlertTriangle, Link2Off, RefreshCw, ShieldCheck } from 'lucide-react';
import { TRUTH_LABEL, TRUTH_TONE, freshness, type TruthMeta, type TruthState } from '@/lib/truth';

/** Small provenance chip. Every externally-sourced panel must render one. */
export function TruthBadge({ state, meta, className = '' }: { state?: TruthState; meta?: TruthMeta; className?: string }) {
    const s = state ?? meta?.truthState ?? 'unavailable';
    const age = freshness(meta?.fetchedAt ?? meta?.observedAt);
    return (
        <span
            title={meta?.error ?? meta?.source ?? undefined}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TRUTH_TONE[s]} ${className}`}
        >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
            {TRUTH_LABEL[s]}
            {age && s !== 'not_connected' && <span className="font-semibold opacity-70">· {age}</span>}
        </span>
    );
}

/** Honest empty state for a connector that has no credentials configured. */
export function ConnectorEmpty({
    title,
    description,
    docsUrl,
    onRetry,
}: {
    title: string;
    description: string;
    docsUrl?: string;
    onRetry?: () => void;
}) {
    return (
        <div className="card-glass flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                <Link2Off size={20} />
            </div>
            <div>
                <div className="text-sm font-bold text-foreground">{title}</div>
                <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="flex items-center gap-2">
                {onRetry && (
                    <button onClick={onRetry} className="btn-secondary text-xs">
                        <RefreshCw size={12} /> Retry
                    </button>
                )}
                {docsUrl && (
                    <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs">
                        How to connect
                    </a>
                )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <ShieldCheck size={11} /> No demo data is ever shown here
            </div>
        </div>
    );
}

/** Real error surface — never silently swallowed. */
export function ConnectorError({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div className="card-glass flex items-start gap-3 border-red-500/25 p-4">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
            <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-foreground">Connector request failed</div>
                <p className="mt-0.5 break-words text-xs text-muted-foreground">{message}</p>
            </div>
            {onRetry && (
                <button onClick={onRetry} className="btn-secondary shrink-0 text-xs">
                    <RefreshCw size={12} /> Retry
                </button>
            )}
        </div>
    );
}
