import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { smartFind, type SmartFindMatch } from "@/lib/smartFind.functions";
import { useNavigationStore } from "@/stores/navigationStore";

type Item = { id: string; kind: "note" | "task"; title: string; text: string };

/** Collects only non-sensitive notes and tasks; credentials and vault data never leave the device. */
async function collectItems(): Promise<Item[]> {
  const [notes, tasks] = await Promise.all([db.notes.toArray(), db.tasks.toArray()]);
  const clip = (s: string, n: number) => (s || "").replace(/<[^>]+>/g, " ").slice(0, n);
  return [
    ...notes.filter(n => n.status !== "archived").map(n => ({ id: n.id, kind: "note" as const, title: clip(n.title, 200), text: clip(`${(n.tags || []).join(" ")} ${n.content}`, 400) })),
    ...tasks.map(t => ({ id: t.id, kind: "task" as const, title: clip(t.title, 200), text: clip(`${t.status} ${t.category} ${t.dueDate} ${t.description}`, 400) })),
  ].slice(0, 1500);
}

export default function SmartFindDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const run = useServerFn(smartFind);
  const go = useNavigationStore(s => s.setActiveSection);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<(SmartFindMatch & Item)[] | null>(null);

  async function search() {
    if (query.trim().length < 2 || busy) return;
    setBusy(true); setError("");
    try {
      const items = await collectItems();
      const byId = new Map(items.map(i => [i.id, i]));
      const res = await run({ data: { query, items } });
      if (res.error) setError(res.error);
      setResults(res.matches.flatMap(m => { const i = byId.get(m.id); return i ? [{ ...i, ...m }] : []; }));
    } catch { setError("AI search is unavailable. Check your owner passcode in Settings."); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogTitle className="flex items-center gap-2"><Sparkles size={18} className="text-primary" />Smart find</DialogTitle>
        <DialogDescription>Describe the note or task you're looking for. Only notes and tasks are searched — never passwords or family records.</DialogDescription>
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void search(); }}>
          <Input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. the idea about a Greek recipe site from last month" />
          <Button type="submit" disabled={busy || query.trim().length < 2}>{busy ? "Finding…" : "Find"}</Button>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {results && !error && results.length === 0 && <p className="text-sm text-muted-foreground">Nothing matched. Try describing it differently.</p>}
        {results && results.length > 0 && (
          <ul className="max-h-96 overflow-y-auto divide-y divide-border rounded-xl border border-border">
            {results.map(r => (
              <li key={r.id}>
                <button type="button" className="w-full text-left p-3 hover:bg-secondary/60" onClick={() => { go(r.kind === "note" ? "notes" : "tasks"); onClose(); }}>
                  <div className="flex items-center gap-2"><span className="text-xs uppercase tracking-wide text-primary">{r.kind}</span><span className="font-medium truncate">{r.title || "Untitled"}</span></div>
                  <div className="text-xs text-muted-foreground mt-0.5">{r.reason}</div>
                </button>
              </li>))}
          </ul>)}
      </DialogContent>
    </Dialog>
  );
}
