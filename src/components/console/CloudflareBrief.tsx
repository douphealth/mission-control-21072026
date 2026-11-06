import { useMemo } from "react";
import type { CloudflareInventory } from "@/lib/cloudflareInventory.server";
import { cloudflareBrief } from "@/lib/opsBrief";
import { BriefShell, FixQueue, ScoreRing, Stat } from "./OpsBrief";

export default function CloudflareBrief({
  inventory,
  onGo,
}: {
  inventory: CloudflareInventory | null;
  onGo: (tab: "projects" | "zones") => void;
}) {
  const b = useMemo(
    () => (inventory ? cloudflareBrief(inventory.rows, inventory.accountDetails ?? []) : null),
    [inventory],
  );
  if (!b || !b.total) return null;
  return (
    <BriefShell title="Today's Cloudflare brief">
      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <ScoreRing score={b.score} label="Estate health" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          <Stat label="Total" value={b.total} hint="Pages + Workers" onClick={() => onGo("projects")} />
          <Stat label="Pages" value={b.pages} />
          <Stat label="Workers" value={b.workers} />
          <Stat label="Failing" value={b.failing} tone={b.failing ? "bad" : "good"} hint="Last build failed" />
          <Stat label="Never deployed" value={b.never} tone={b.never ? "warn" : "default"} />
          <Stat label="Stale" value={b.stale} hint="No deploy 90+ days" />
          <Stat label="Git linked" value={b.gitLinked} hint={Math.round((b.gitLinked / b.total) * 100) + "% of total"} />
          <Stat label="Custom domain" value={b.customDomain} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Fix next · {b.queue.length}
          </h3>
          <FixQueue items={b.queue} empty="Nothing needs attention — every project is deployed and recent." />
        </div>
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            By account
          </h3>
          <ul className="space-y-2">
            {b.accountRows.map((a) => (
              <li key={a.accountId} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{a.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">…{a.accountId.slice(-6)}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span><b className="text-foreground">{a.pages}</b> Pages</span>
                  <span><b className="text-foreground">{a.workers}</b> Workers</span>
                  <span><b className="text-foreground">{a.zones}</b> domains</span>
                  <span className={a.failing ? "font-semibold text-destructive" : ""}>{a.failing} failing</span>
                </div>
                {!a.complete && (
                  <p className="mt-1 text-[11px] text-destructive">
                    Partial data: {a.errors[0]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </BriefShell>
  );
}
