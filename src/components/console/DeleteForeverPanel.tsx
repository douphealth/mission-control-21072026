import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DeleteResourceDialog, {
  type DeletedOutcome,
  type DeleteTarget,
} from "@/components/console/DeleteResourceDialog";

/** "Danger zone" card in detail views; opens the shared confirmation dialog. */
export default function DeleteForeverPanel({
  target,
  onDeleted,
  onUnsettled,
}: {
  target: DeleteTarget;
  onDeleted: (outcome: DeletedOutcome) => void;
  onUnsettled?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-3.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-destructive">
        Danger zone
      </h3>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          Permanently delete this {target.what}. This cannot be undone.
        </p>
        <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
          <Trash2 size={14} /> Delete {target.what}
        </Button>
      </div>
      <DeleteResourceDialog
        target={open ? target : null}
        onOpenChange={setOpen}
        onDeleted={(_, outcome) => onDeleted(outcome)}
        onUnsettled={onUnsettled}
      />
    </section>
  );
}
