import { useMemo, useState } from "react";
import { Grid2X2, Home, Plus, Target, CheckSquare } from "lucide-react";
import { useNavigationStore } from "@/stores/navigationStore";
import { useTasks } from "@/hooks/useTableData";
import { CAPTURE_FOCUS_EVENT } from "@/components/dashboard/QuickCaptureBar";
import { MISSION_NAV, NAV_GROUP_LABELS, type MissionNavGroup } from "@/lib/navigation";

export default function MobileBottomNav() {
  const { activeSection, setActiveSection } = useNavigationStore();
  const tasks = useTasks();
  const [moreOpen, setMoreOpen] = useState(false);

  const openTasks = tasks.filter((t) => t.status !== "done").length;
  const groups = useMemo(() => {
    const out: Record<MissionNavGroup, typeof MISSION_NAV> = {
      operate: [],
      grow: [],
      manage: [],
      systems: [],
    };
    for (const item of MISSION_NAV) out[item.group].push(item);
    for (const key of Object.keys(out) as MissionNavGroup[]) {
      out[key].sort((a, b) => b.rank - a.rank);
    }
    return out;
  }, []);

  const go = (id: string) => {
    setActiveSection(id);
    setMoreOpen(false);
  };

  const capture = () => {
    setMoreOpen(false);
    setActiveSection("dashboard");
    requestAnimationFrame(() => window.dispatchEvent(new Event(CAPTURE_FOCUS_EVENT)));
  };

  const tabClass = (active: boolean) =>
    `relative flex min-h-[50px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl transition-all touch-manipulation active:scale-[0.94] ${
      active ? "bg-primary/10 text-primary" : "text-muted-foreground/70"
    }`;

  return (
    <>
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Close all sections"
            className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <section className="mobile-sheet-luxe fixed bottom-[82px] left-2 right-2 z-50 max-h-[72vh] overflow-hidden rounded-[28px] lg:hidden">
            <div className="flex justify-center pt-3">
              <div className="h-1.5 w-10 rounded-full bg-muted-foreground/20" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 pt-3">
              <div>
                <h2 className="font-display text-[16px] font-extrabold tracking-tight text-foreground">
                  Mission Control
                </h2>
                <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                  Jump directly to the work you need.
                </p>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-3 pb-5">
              {(["operate", "grow", "manage", "systems"] as const).map((group) => (
                <div key={group} className="mb-4 last:mb-0">
                  <div className="px-2 pb-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground/55">
                    {NAV_GROUP_LABELS[group]}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {groups[group].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => go(item.id)}
                        className={`flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center transition active:scale-95 ${
                          activeSection === item.id
                            ? "border-primary/25 bg-primary/10 text-primary"
                            : "border-border/25 bg-card/45 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                        }`}
                      >
                        <item.icon size={18} strokeWidth={activeSection === item.id ? 2.3 : 1.7} />
                        <span className="text-[10px] font-semibold leading-tight">
                          {item.shortLabel || item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)*0.5+0.5rem)] lg:hidden">
        <div className="mobile-liquid-bar rounded-[25px] px-2 py-1.5 shadow-[0_20px_50px_-24px_hsl(var(--foreground)/0.45)]">
          <div className="flex items-stretch gap-1">
            <button
              type="button"
              onClick={() => go("dashboard")}
              className={tabClass(activeSection === "dashboard")}
            >
              <Home size={19} strokeWidth={activeSection === "dashboard" ? 2.4 : 1.7} />
              <span className="text-[9.5px] font-semibold leading-none">Home</span>
            </button>

            <button
              type="button"
              onClick={() => go("now")}
              className={tabClass(activeSection === "now")}
            >
              <Target size={19} strokeWidth={activeSection === "now" ? 2.4 : 1.7} />
              <span className="text-[9.5px] font-semibold leading-none">Today</span>
            </button>

            <button
              type="button"
              onClick={capture}
              aria-label="Capture something"
              className="relative -mt-6 flex h-[58px] w-[58px] shrink-0 items-center justify-center self-center rounded-full border-[5px] border-background bg-gradient-to-br from-primary via-primary to-cyan-500 text-primary-foreground shadow-[0_16px_36px_-12px_hsl(var(--primary)/0.85)] transition active:scale-90"
            >
              <Plus size={24} strokeWidth={2.5} />
            </button>

            <button
              type="button"
              onClick={() => go("tasks")}
              className={tabClass(activeSection === "tasks")}
            >
              <div className="relative">
                <CheckSquare size={19} strokeWidth={activeSection === "tasks" ? 2.4 : 1.7} />
                {openTasks > 0 && (
                  <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[8px] font-extrabold text-destructive-foreground">
                    {openTasks > 99 ? "99+" : openTasks}
                  </span>
                )}
              </div>
              <span className="text-[9.5px] font-semibold leading-none">Tasks</span>
            </button>

            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              className={tabClass(moreOpen)}
            >
              <Grid2X2 size={19} strokeWidth={moreOpen ? 2.4 : 1.7} />
              <span className="text-[9.5px] font-semibold leading-none">More</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
