import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { useNavigationStore } from "@/stores/navigationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  useTasks,
  usePayments,
  useIdeas,
  useCustomModules,
} from "@/hooks/useTableData";
import {
  GROW_NAV_IDS,
  MISSION_NAV,
  NAV_GROUP_LABELS,
  PRIMARY_NAV_IDS,
  missionNavItems,
  type MissionNavGroup,
} from "@/lib/navigation";

const primaryItems = missionNavItems(PRIMARY_NAV_IDS);
const growItems = missionNavItems(GROW_NAV_IDS);

export default function Sidebar() {
  const tasks = useTasks();
  const payments = usePayments();
  const ideas = useIdeas();
  const customModules = useCustomModules();
  const {
    activeSection,
    setActiveSection,
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    setCommandPaletteOpen,
  } = useNavigationStore();
  const { userName } = useSettingsStore();

  const [openGroups, setOpenGroups] = useState<Record<MissionNavGroup, boolean>>({
    operate: true,
    grow: true,
    manage: false,
    systems: false,
  });

  const counts = useMemo(
    () => ({
      tasks: tasks.filter((t) => t.status !== "done").length,
      payments: payments.filter((p) => p.status === "overdue").length,
      ideas: ideas.filter((i) => i.status === "exploring" || i.status === "validated").length,
    }),
    [tasks, payments, ideas],
  );

  const grouped = useMemo(() => {
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

  const isCollapsed = sidebarCollapsed;

  const go = (id: string) => {
    setActiveSection(id);
    setSidebarOpen(false);
  };

  const badgeFor = (id: string) => {
    if (id === "tasks" && counts.tasks > 0) return counts.tasks;
    if (id === "payments" && counts.payments > 0) return counts.payments;
    if (id === "ideas" && counts.ideas > 0) return counts.ideas;
    return null;
  };

  const renderItem = (item: (typeof MISSION_NAV)[number]) => {
    const active = activeSection === item.id;
    const badge = badgeFor(item.id);
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => go(item.id)}
        title={isCollapsed ? item.label : item.description}
        className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 ${
          isCollapsed ? "justify-center px-0" : ""
        } ${
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_14px_30px_-18px_hsl(var(--sidebar-primary)/0.85)]"
            : "text-sidebar-foreground/68 hover:bg-sidebar-accent/75 hover:text-sidebar-accent-foreground"
        }`}
      >
        <item.icon size={16} strokeWidth={active ? 2.3 : 1.7} className="shrink-0" />
        {!isCollapsed && <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>}
        {badge !== null && !isCollapsed && (
          <span
            className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[9px] font-extrabold ${
              active ? "bg-primary-foreground/18 text-primary-foreground" : "bg-primary/10 text-primary"
            }`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        {badge !== null && isCollapsed && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[8px] font-bold text-destructive-foreground">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-sidebar-border/65 bg-sidebar/94 text-sidebar-foreground shadow-[18px_0_60px_-48px_hsl(var(--foreground)/0.65)] backdrop-blur-2xl transition-all duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ width: isCollapsed ? 76 : 272 }}
      >
        <div
          className={`flex h-[72px] items-center border-b border-sidebar-border/60 ${
            isCollapsed ? "justify-center px-3" : "gap-3 px-4"
          }`}
        >
          <button
            type="button"
            onClick={() => go("dashboard")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary via-primary to-cyan-500 text-sm font-black text-primary-foreground shadow-[var(--shadow-primary)]"
            title="Mission Control"
          >
            M
          </button>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="font-display text-[14px] font-extrabold tracking-tight text-sidebar-foreground">
                Mission Control
              </div>
              <div className="text-[10px] font-medium text-sidebar-foreground/40">
                Decide · Do · Grow
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setSidebarCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-[88px] z-50 hidden h-7 w-7 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg transition hover:scale-105 hover:bg-sidebar-accent lg:flex"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        <div className="px-3 pt-4">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className={`flex h-10 w-full items-center gap-2.5 rounded-2xl border border-sidebar-border/55 bg-sidebar-accent/35 text-sidebar-foreground/55 transition hover:border-sidebar-primary/25 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground ${
              isCollapsed ? "justify-center px-0" : "px-3"
            }`}
            title="Search everything"
          >
            <Search size={15} />
            {!isCollapsed && (
              <>
                <span className="min-w-0 flex-1 text-left text-[12px] font-medium">Search everything</span>
                <kbd className="rounded-md border border-sidebar-border/50 px-1.5 py-0.5 text-[9px]">⌘K</kbd>
              </>
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">{primaryItems.map(renderItem)}</div>

          {!isCollapsed && (
            <div className="my-4 flex items-center gap-2 px-2">
              <div className="h-px flex-1 bg-sidebar-border/55" />
              <span className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-sidebar-foreground/28">
                Grow
              </span>
              <div className="h-px flex-1 bg-sidebar-border/55" />
            </div>
          )}

          <div className="space-y-1">{growItems.map(renderItem)}</div>

          {(["manage", "systems"] as const).map((group) => (
            <div key={group} className="mt-4">
              <button
                type="button"
                onClick={() => setOpenGroups((s) => ({ ...s, [group]: !s[group] }))}
                className={`flex w-full items-center rounded-xl px-2 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-sidebar-foreground/38 transition hover:text-sidebar-foreground/70 ${
                  isCollapsed ? "justify-center" : "justify-between"
                }`}
                title={NAV_GROUP_LABELS[group]}
              >
                {!isCollapsed && <span>{NAV_GROUP_LABELS[group]}</span>}
                <ChevronDown
                  size={13}
                  className={`transition-transform ${openGroups[group] ? "rotate-180" : ""}`}
                />
              </button>
              {openGroups[group] && (
                <div className="mt-1 space-y-1">{grouped[group].map(renderItem)}</div>
              )}
            </div>
          ))}

          {customModules.filter((m) => m.visible).length > 0 && (
            <div className="mt-4 border-t border-sidebar-border/50 pt-4">
              {!isCollapsed && (
                <div className="px-2 pb-2 text-[9px] font-extrabold uppercase tracking-[0.14em] text-sidebar-foreground/30">
                  Custom
                </div>
              )}
              <div className="space-y-1">
                {customModules
                  .filter((m) => m.visible)
                  .sort((a, b) => a.order - b.order)
                  .map((mod) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => go(`custom-${mod.id}`)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-semibold transition ${
                        activeSection === `custom-${mod.id}`
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                      } ${isCollapsed ? "justify-center px-0" : ""}`}
                      title={mod.name}
                    >
                      <span className="text-sm">{mod.icon}</span>
                      {!isCollapsed && <span className="truncate">{mod.name}</span>}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-sidebar-border/60 p-3">
          <button
            type="button"
            onClick={() => go("settings")}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sidebar-foreground/58 transition hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground ${
              isCollapsed ? "justify-center px-0" : ""
            }`}
            title="Settings"
          >
            <Settings size={16} />
            {!isCollapsed && (
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-[12px] font-bold">{userName || "Workspace"}</div>
                <div className="text-[9px] text-sidebar-foreground/35">Settings & connections</div>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
