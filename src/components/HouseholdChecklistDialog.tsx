import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ListChecks, LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { generateHouseholdChecklist } from "@/lib/householdChecklist.functions";
import { householdTask, type HouseholdPlanData } from "@/lib/householdChecklist";
import { useAddItem } from "@/hooks/useTableData";
import { useNavigationStore } from "@/stores/navigationStore";

export default function HouseholdChecklistDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const run = useServerFn(generateHouseholdChecklist);
  const add = useAddItem();
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [plan, setPlan] = useState<HouseholdPlanData>();
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function generate() {
    if (busy || description.trim().length < 5) return;
    setBusy(true); setError("");
    try { const result = await run({ data: { description } }); if (result.error) setError(result.error); else setPlan(result.plan); }
    catch { setError("Check your owner access in Settings before generating a checklist. Your description is still here."); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!plan || saving) return;
    setSaving(true); setError("");
    try { const task = householdTask(plan, owner); const id = await add("tasks", task); useNavigationStore.getState().setFocusTaskId(id); useNavigationStore.getState().setActiveSection("tasks"); setPlan(undefined); setDescription(""); onClose(); }
    catch { setError("The task could not be saved. Your checklist is still here."); }
    finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={o => { if (!o && !busy && !saving) onClose(); }}><DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto">
    <DialogTitle className="flex items-center gap-2"><ListChecks className="text-primary" />Household checklist</DialogTitle>
    <DialogDescription>Only your description is sent to AI. Do not include passwords, banking details or private family records.</DialogDescription>
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); void generate(); }}>
      <label className="block space-y-2"><span>Household task</span><Textarea value={description} maxLength={2000} onChange={e => setDescription(e.target.value)} placeholder="e.g. Prepare the house for guests this weekend" className="min-h-28" /></label>
      <Button type="submit" disabled={busy || saving || description.trim().length < 5}>{busy ? <LoaderCircle className="animate-spin" /> : <ListChecks />}{busy ? "Planning…" : plan ? "Generate again" : "Generate checklist"}</Button>
    </form>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {plan && <div className="space-y-4"><label className="block space-y-2"><span>Task title</span><Input value={plan.title} maxLength={160} onChange={e => setPlan({ ...plan, title: e.target.value })} /></label>
      {plan.caution && <p className="border-l-2 border-primary pl-3 text-muted-foreground">{plan.caution}</p>}
      <ol className="divide-y divide-border">{plan.steps.map((step, i) => <li key={i} className="py-3 space-y-2"><div className="flex items-start gap-2"><span className="shrink-0 text-primary">{i + 1}.</span><label className="min-w-0 flex-1"><span className="text-sm text-muted-foreground">{step.priority} priority</span><Input aria-label={`Step ${i + 1}`} value={step.title} maxLength={200} onChange={e => setPlan({ ...plan, steps: plan.steps.map((s, n) => n === i ? { ...s, title: e.target.value } : s) })} /></label></div><p className="pl-6 break-words text-muted-foreground">{step.detail}</p></li>)}</ol>
      <label className="block space-y-2"><span>Assigned to (optional)</span><Input value={owner} onChange={e => setOwner(e.target.value)} maxLength={100} /></label>
      <Button disabled={busy || saving || !plan.title.trim() || plan.steps.some(s => !s.title.trim())} onClick={() => void save()}>{saving ? "Saving…" : "Save checklist to Tasks"}</Button>
    </div>}
  </DialogContent></Dialog>;
}