import { usePlanStore } from "@/stores/planStore";

const inputCls =
  "rounded-xl border border-border/50 bg-secondary/40 px-2 py-2 text-xs text-foreground outline-none focus:border-primary/60";

export default function PlanningSettings() {
  const { workdayStart, workdayEnd, personalAsBusy, setWorkday, setPersonalAsBusy } =
    usePlanStore();
  return (
    <div className="card-elevated space-y-4 p-4">
      <div>
        <h3 className="text-sm font-bold text-foreground">Planning</h3>
        <p className="text-[11px] text-muted-foreground">
          Your workday sets the capacity check on Today. Personal items can be mirrored to the
          calendar as an opaque “Busy” slot — availability without titles or notes.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
        <label className="text-[10px] text-muted-foreground">
          Workday starts
          <input
            type="time"
            value={workdayStart}
            onChange={(e) => setWorkday(e.target.value, workdayEnd)}
            className={`mt-1 w-full ${inputCls}`}
          />
        </label>
        <label className="text-[10px] text-muted-foreground">
          Workday ends
          <input
            type="time"
            value={workdayEnd}
            onChange={(e) => setWorkday(workdayStart, e.target.value)}
            className={`mt-1 w-full ${inputCls}`}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-xs text-foreground">
        <input
          type="checkbox"
          checked={personalAsBusy}
          onChange={(e) => setPersonalAsBusy(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        Mirror personal tasks to Google Calendar as “Busy” (no title, no notes)
      </label>
    </div>
  );
}
