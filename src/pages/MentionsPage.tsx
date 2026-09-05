import { useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { useStreamItems, useWatchTerms, genId } from "@/hooks/useTableData";
import { db, type WatchTermType } from "@/lib/db";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import { runMentionCollector } from "@/lib/controlCenter";
import { CCHeader, EmptyState, Panel, StreamRow, relTime } from "@/components/controlcenter/ui";

const TYPES: WatchTermType[] = ["name", "brand", "handle", "domain"];

export default function MentionsPage() {
  const terms = useWatchTerms();
  const items = useStreamItems();
  const [term, setTerm] = useState("");
  const [type, setType] = useState<WatchTermType>("brand");
  const [anchors, setAnchors] = useState("");
  const [negatives, setNegatives] = useState("");
  const [busy, setBusy] = useState(false);

  const mentions = useMemo(
    () =>
      items
        .filter((i) => i.kind === "mention" && i.status === "active")
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, 120),
    [items],
  );

  const addTerm = async () => {
    const clean = term.trim();
    if (!clean) return;
    const record = {
      id: genId(),
      term: clean,
      type,
      anchors: anchors
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      negatives: negatives
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    await db.watchTerms.put(record);
    markCloudRecordDirty("watchTerms", record.id);
    queueCloudPush();
    setTerm("");
    setAnchors("");
    setNegatives("");
    toast.success(`Watching “${record.term}”`);
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const { added, errors } = await runMentionCollector();
      toast.success(
        added ? `${added} new ${added === 1 ? "mention" : "mentions"}` : "No new mentions",
        {
          description: errors.slice(0, 2).join(" · ") || undefined,
        },
      );
    } catch (e: any) {
      toast.error("Mention scan failed", { description: String(e?.message ?? e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <CCHeader
        title="Brand Mentions"
        subtitle="Identity-verified monitoring — anchors keep common names from producing noise."
        actions={
          <button
            onClick={refresh}
            disabled={busy || !terms.length}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold gradient-primary text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} /> Scan now
          </button>
        }
      />

      <Panel>
        <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-3">
          Watch a term
        </p>
        <div className="grid gap-2 sm:grid-cols-[1.2fr_auto_1.2fr_1.2fr_auto]">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTerm()}
            placeholder="Your name, brand, @handle or domain"
            className="px-3 py-2 rounded-xl bg-background border border-border text-sm"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as WatchTermType)}
            className="px-3 py-2 rounded-xl bg-background border border-border text-sm capitalize"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={anchors}
            onChange={(e) => setAnchors(e.target.value)}
            placeholder="Must also mention (comma separated)"
            className="px-3 py-2 rounded-xl bg-background border border-border text-sm"
          />
          <input
            value={negatives}
            onChange={(e) => setNegatives(e.target.value)}
            placeholder="Exclude if it mentions…"
            className="px-3 py-2 rounded-xl bg-background border border-border text-sm"
          />
          <button
            onClick={addTerm}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
          >
            <Plus size={14} /> Watch
          </button>
        </div>

        {terms.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {terms.map((t) => (
              <span
                key={t.id}
                className={`inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full border text-xs ${
                  t.enabled
                    ? "border-border bg-background/60"
                    : "border-border/50 bg-muted/40 text-muted-foreground"
                }`}
                title={t.lastCheckedAt ? `Scanned ${relTime(t.lastCheckedAt)}` : "Never scanned"}
              >
                <span className="font-semibold">{t.term}</span>
                <span className="text-[10px] uppercase text-muted-foreground">{t.type}</span>
                <button
                  onClick={async () => {
                    await db.watchTerms.update(t.id, { enabled: !t.enabled });
                    markCloudRecordDirty("watchTerms", t.id);
                    queueCloudPush();
                  }}
                  className="p-1 rounded-full hover:bg-secondary"
                  aria-label="Toggle term"
                >
                  <Power size={12} />
                </button>
                <button
                  onClick={async () => {
                    await db.watchTerms.delete(t.id);
                    markCloudRecordDirty("watchTerms", t.id, "delete");
                    queueCloudPush();
                  }}
                  className="p-1 rounded-full hover:bg-destructive/15 hover:text-destructive"
                  aria-label="Remove term"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </Panel>

      {mentions.length === 0 ? (
        <EmptyState
          title={terms.length ? "No verified mentions yet" : "Add a term to watch"}
          hint="Anchors (company, city, niche) are required for common personal names so you only see the real you."
        />
      ) : (
        <div className="grid gap-2.5">
          {mentions.map((m) => (
            <StreamRow key={m.id} item={m} />
          ))}
        </div>
      )}
    </div>
  );
}
