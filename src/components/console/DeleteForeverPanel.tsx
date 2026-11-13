import { useEffect, useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DeleteOutcome } from "@/lib/providerDelete.functions";

/**
 * "Danger zone" card + type-the-name confirmation for permanent provider
 * deletes. Nothing is sent until the exact name is typed.
 */
export default function DeleteForeverPanel({
  what,
  confirmText,
  consequences,
  onDelete,
  onDeleted,
}: {
  /** e.g. "repository" or "Pages project" */
  what: string;
  /** Exact text the owner must type (the name shown in the provider). */
  confirmText: string;
  consequences: string[];
  onDelete: () => Promise<DeleteOutcome>;
  onDeleted: (outcome: Extract<DeleteOutcome, { ok: true }>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) {
      setTyped("");
      setError(null);
    }
  }, [open]);
  const matches = typed.trim() === confirmText;

  const run = async () => {
    if (!matches || busy) return;
    setBusy(true);
    setError(null);
    try {
      const outcome = await onDelete();
      if (outcome.ok) {
        setOpen(false);
        onDeleted(outcome);
      } else setError(outcome.message);
    } catch {
      setError("Could not reach the server. Nothing was deleted — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-3.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-destructive">Danger zone</h3>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          Permanently delete this {what}. This cannot be undone.
        </p>
        <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
          <Trash2 size={14} /> Delete {what}
        </Button>
      </div>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this {what} forever?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {consequences.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              void run();
            }}
          >
            <label className="block text-sm" htmlFor="delete-forever-confirm">
              Type <code className="break-all rounded bg-muted px-1.5 py-0.5 font-semibold">{confirmText}</code> to
              confirm
            </label>
            <Input
              id="delete-forever-confirm"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={busy}
            />
            {error && (
              <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
                {error}
              </p>
            )}
            <DialogFooter className="gap-2 pt-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={!matches || busy}>
                {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {busy ? "Deleting…" : "Delete forever"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
