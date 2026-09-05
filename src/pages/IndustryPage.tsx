import { useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2, Power, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useFeedSources, useStreamItems, genId } from "@/hooks/useTableData";
import { db } from "@/lib/db";
import { markCloudRecordDirty, queueCloudPush } from "@/lib/cloudSync";
import { runIndustryCollector } from "@/lib/controlCenter";
import { CCHeader, EmptyState, Panel, StreamRow, relTime } from "@/components/controlcenter/ui";

export default function IndustryPage() {
  const sources = useFeedSources();
  const items = useStreamItems();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [topics, setTopics] = useState("");
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const stories = useMemo(
    () =>
      items
        .filter(
          (i) =>
            i.kind === "industry" &&
            (showArchived ? i.status === "archived" : i.status === "active"),
        )
        .sort((a, b) => b.score - a.score || b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, 120),
    [items, showArchived],
  );

  const addSource = async () => {
    const clean = url.trim();
    if (!clean) return;
    const normalised = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
    let host = "";
    try {
      host = new URL(normalised).hostname.replace(/^www\./, "");
    } catch {
      toast.error("That does not look like a valid URL");
      return;
    }
    const record = {
      id: genId(),
      name: name.trim() || host,
      url: normalised,
      topics: topics
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    await db.feedSources.put(record);
    markCloudRecordDirty("feedSources", record.id);
    queueCloudPush();
    setUrl("");
    setName("");
    setTopics("");
    toast.success(`Added ${record.name}`);
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const { added, errors } = await runIndustryCollector();
      toast[errors.length && !added ? "warning" : "success"](
        added ? `${added} new ${added === 1 ? "story" : "stories"}` : "No new stories",
        { description: errors.slice(0, 2).join(" · ") || undefined },
      );
    } catch (e: any) {
      toast.error("Refresh failed", { description: String(e?.message ?? e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <CCHeader
        title="Industry News"
        subtitle="Feeds you choose, ranked by what actually matters today."
        actions={
          <>
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/70 text-foreground"
            >
              {showArchived ? "Show active" : "Show archived"}
            </button>
            <button
              onClick={refresh}
              disabled={busy || !sources.length}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold gradient-primary text-primary-foreground disabled:opacity-50"
            >
              <RefreshCw size={13} className={busy ? "animate-spin" : ""} /> Refresh feeds
            </button>
          </>
        }
      />

      <Panel>
        <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-3">
          Add a source
        </p>
        <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1.2fr_auto]">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSource()}
            placeholder="Site or feed URL (e.g. techcrunch.com)"
            className="px-3 py-2 rounded-xl bg-background border border-border text-sm"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Label (optional)"
            className="px-3 py-2 rounded-xl bg-background border border-border text-sm"
          />
          <input
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            placeholder="Topics, comma separated"
            className="px-3 py-2 rounded-xl bg-background border border-border text-sm"
          />
          <button
            onClick={addSource}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {sources.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {sources.map((s) => (
              <span
                key={s.id}
                className={`group inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full border text-xs ${
                  s.enabled
                    ? "border-border bg-background/60 text-foreground"
                    : "border-border/50 bg-muted/40 text-muted-foreground"
                }`}
                title={
                  s.lastError
                    ? s.lastError
                    : s.lastCheckedAt
                      ? `Checked ${relTime(s.lastCheckedAt)}`
                      : "Never checked"
                }
              >
                {s.lastError && <AlertTriangle size={12} className="text-amber-500" />}
                <span className="font-semibold">{s.name}</span>
                <button
                  onClick={async () => {
                    await db.feedSources.update(s.id, { enabled: !s.enabled });
                    markCloudRecordDirty("feedSources", s.id);
                    queueCloudPush();
                  }}
                  className="p-1 rounded-full hover:bg-secondary"
                  aria-label="Toggle source"
                >
                  <Power size={12} />
                </button>
                <button
                  onClick={async () => {
                    await db.feedSources.delete(s.id);
                    markCloudRecordDirty("feedSources", s.id, "delete");
                    queueCloudPush();
                  }}
                  className="p-1 rounded-full hover:bg-destructive/15 hover:text-destructive"
                  aria-label="Remove source"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </Panel>

      {stories.length === 0 ? (
        <EmptyState
          title={sources.length ? "No stories yet" : "Add your first source"}
          hint={
            sources.length
              ? "Hit “Refresh feeds” to pull the latest headlines."
              : "Paste any site URL — the feed is discovered automatically. Topics let you surface specific themes."
          }
        />
      ) : (
        <div className="grid gap-2.5">
          {stories.map((s) => (
            <StreamRow key={s.id} item={s} />
          ))}
        </div>
      )}
    </div>
  );
}
