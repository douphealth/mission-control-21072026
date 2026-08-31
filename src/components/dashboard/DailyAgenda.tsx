import { Clock } from "lucide-react";
import { useNavigationStore } from "@/stores/navigationStore";

export interface AgendaRow {
  id: string;
  time: string;
  title: string;
  kind: string;
  section: string;
}

export default function DailyAgenda({ rows }: { rows: AgendaRow[] }) {
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);

  return (
    <section className="enterprise-card rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Agenda</div>
          <h3 className="font-display text-[17px] font-extrabold tracking-tight text-foreground">Timed today</h3>
        </div>
        <button
          onClick={() => setActiveSection("calendar")}
          className="rounded-full bg-secondary px-3 py-1.5 text-[11px] font-bold text-foreground transition hover:bg-secondary/70"
        >
          Calendar
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/70 p-5 text-center text-[12px] text-muted-foreground">
          Nothing is time-boxed today.
        </p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveSection(r.section)}
              className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-secondary/50"
            >
              <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary text-[11px] font-extrabold tabular-nums text-foreground">
                {r.time}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-foreground">{r.title}</span>
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{r.kind}</span>
              </span>
              <Clock size={13} className="shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
