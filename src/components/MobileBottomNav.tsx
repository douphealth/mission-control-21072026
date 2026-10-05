import { useNavigationStore } from "@/stores/navigationStore";
import { useTasks, useDecisions } from "@/hooks/useTableData";
import {
  Plus,
  Search,
  Grip,
  CheckSquare,
  Calendar,
  FileText,
  Globe,
  DollarSign,
  Timer,
  Flame,
  Lightbulb,
  KeyRound,
  Settings,
  Github,
  Hammer,
  Link2,
  PanelsTopLeft,
  RefreshCcw,
  Scale,
  Bell,
  Radar,
  Newspaper,
  AtSign,
  Users,
  Home,
  AppWindow,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CAPTURE_FOCUS_EVENT } from "@/components/dashboard/QuickCaptureBar";
import AreaSwitch from "@/components/AreaSwitch";
import { usePlanStore } from "@/stores/planStore";

const moreItems = [
  { id: "tasks", label: "Tasks", icon: CheckSquare },

  { id: "review", label: "Review", icon: RefreshCcw },
  { id: "focus", label: "Focus", icon: Timer },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "decisions", label: "Findings", icon: Scale },
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "control-center", label: "Captures", icon: Radar },
  { id: "websites", label: "Sites", icon: Globe },
  { id: "apps-funnels", label: "Apps", icon: AppWindow },
  { id: "seo", label: "SEO", icon: Search },
  { id: "payments", label: "Finance", icon: DollarSign },
  { id: "industry", label: "Trends", icon: Newspaper },
  { id: "mentions", label: "Mentions", icon: AtSign },
  { id: "audience", label: "Audience", icon: Users },
  { id: "projects", label: "Projects", icon: PanelsTopLeft },
  { id: "habits", label: "Habits", icon: Flame },
  { id: "ideas", label: "Ideas", icon: Lightbulb },
  { id: "credentials", label: "Vault", icon: KeyRound },
  { id: "github", label: "GitHub", icon: Github },
  { id: "builds", label: "Builds", icon: Hammer },
  { id: "links", label: "Links", icon: Link2 },
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "demo", label: "Guided Demo", icon: WandSparkles },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function MobileBottomNav() {
  const { activeSection, setActiveSection } = useNavigationStore();
  const tasks = useTasks();
  const decisions = useDecisions();
  const [moreOpen, setMoreOpen] = useState(false);
  const [query, setQuery] = useState("");
  const area = usePlanStore((state) => state.area);

  useEffect(() => {
    if (!moreOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMoreOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  const inboxCount =
    tasks.filter((t) => t.status === "todo" && !t.dueDate).length +
    decisions.filter((d) => d.status === "open").length;

  const go = (id: string) => {
    setActiveSection(id);
    setMoreOpen(false);
    setQuery("");
  };

  const filteredItems = useMemo(() => {
    const homeIds = new Set([
      "tasks",
      "review",
      "focus",
      "calendar",
      "notes",
      "reminders",
      "payments",
      "habits",
      "ideas",
      "links",
      "dashboard",
      "settings",
    ]);
    const source = area === "personal" ? moreItems.filter((item) => homeIds.has(item.id)) : moreItems;
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter((item) =>
      [item.label, item.id].some((value) => value.toLowerCase().includes(q)),
    );
  }, [query, area]);

  const tabCls = (active: boolean) =>
    `mc14-mobile-tab relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl transition-colors touch-manipulation active:scale-[0.94] ${
      active ? "text-primary" : "text-muted-foreground/70"
    }`;

  return (
    <>
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
            onClick={() => {
              setMoreOpen(false);
              setQuery("");
            }}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="All workspaces"
            className="mc13-mobile-sheet mobile-sheet-luxe fixed inset-x-2 top-[max(0.65rem,env(safe-area-inset-top))] bottom-[calc(82px+env(safe-area-inset-bottom,0px))] z-50 flex min-h-0 flex-col overflow-hidden rounded-[30px] lg:hidden animate-slide-up"
          >
            <div className="shrink-0 border-b border-border/35 bg-card/82 px-4 pb-3 pt-3 backdrop-blur-xl">
              <div className="flex justify-center pb-2">
                <div className="h-1.5 w-10 rounded-full bg-muted-foreground/20" />
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary/75">Navigate</div>
                  <h2 className="mt-0.5 text-[18px] font-extrabold tracking-tight text-foreground">All workspaces</h2>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">{filteredItems.length} sections</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <AreaSwitch className="w-full justify-between" />
              </div>
              <label className="mt-3 flex h-11 items-center gap-2 rounded-2xl border border-border/50 bg-background/70 px-3 shadow-sm">
                <Search size={15} className="shrink-0 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search all workspaces…"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/55"
                />
              </label>
            </div>
            <div
              className="mc13-mobile-workspace-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 touch-pan-y"
              tabIndex={0}
            >
              {filteredItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => go(item.id)}
                      className={`group flex min-h-[72px] items-center gap-3 rounded-[20px] border p-3 text-left transition touch-manipulation active:scale-[0.97] ${
                        activeSection === item.id
                          ? "border-primary/25 bg-primary/10 text-primary"
                          : "border-border/35 bg-card/65 text-foreground hover:border-primary/20 hover:bg-card"
                      }`}
                    >
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${
                        activeSection === item.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground group-hover:text-primary"
                      }`}>
                        <item.icon size={18} strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-bold">{item.label}</span>
                        <span className="mt-0.5 block text-[9px] font-medium text-muted-foreground">
                          {item.id === "dashboard" ? "Daily command" : item.id.replaceAll("-", " ")}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/50 px-4 py-8 text-center text-sm text-muted-foreground">
                  No section matches “{query}”.
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)*0.5+0.5rem)] lg:hidden">
        <div className="mc13-bottom-bar mobile-liquid-bar rounded-[24px] px-2 py-1.5">
          <div className="flex items-stretch justify-around gap-1">
            <button
              onClick={() => go("dashboard")}
              className={tabCls(activeSection === "dashboard")}
            >
              <Home size={20} strokeWidth={activeSection === "dashboard" ? 2.4 : 1.7} />
              <span className="text-[10px] font-medium leading-none">Home</span>
            </button>

            <button
              onClick={() => go("tasks")}
              className={tabCls(activeSection === "tasks")}
            >
              <div className="relative">
                <CheckSquare size={20} strokeWidth={activeSection === "tasks" ? 2.4 : 1.7} />
                {tasks.filter((t) => t.status !== "done").length > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {tasks.filter((t) => t.status !== "done").length > 99
                      ? "99+"
                      : tasks.filter((t) => t.status !== "done").length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">Tasks</span>
            </button>

            {/* Central, visually dominant capture */}
            <button
              onClick={() => {
                setMoreOpen(false);
                // Capture is a title, not a form: jump to the home input.
                setActiveSection("dashboard");
                requestAnimationFrame(() => window.dispatchEvent(new Event(CAPTURE_FOCUS_EVENT)));
              }}
              aria-label="Capture"
              className="mc13-mobile-capture relative -mt-6 flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_14px_34px_-12px_hsl(var(--primary)/0.85)] transition active:scale-90 touch-manipulation"
            >
              <Plus size={24} strokeWidth={2.4} />
            </button>

            <button
              onClick={() => go("projects")}
              className={tabCls(activeSection === "projects")}
            >
              <PanelsTopLeft size={20} strokeWidth={activeSection === "projects" ? 2.4 : 1.7} />
              <span className="text-[10px] font-medium leading-none">Projects</span>
            </button>

            <button
              onClick={() => {
                setMoreOpen((o) => !o);
                if (moreOpen) setQuery("");
              }}
              className={tabCls(moreOpen)}
            >
              <Grip size={20} strokeWidth={moreOpen ? 2.4 : 1.7} />
              <span className="text-[10px] font-medium leading-none">More</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
