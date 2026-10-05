import {
  useTasks,
  usePayments,
  useIdeas,
  useCustomModules,
  useAddItem,
} from "@/hooks/useTableData";
import { useNavigationStore } from "@/stores/navigationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { usePlanStore } from "@/stores/planStore";
import { useState } from "react";
import {
  Home,
  CheckSquare,
  Calendar,
  FileText,
  Globe,
  Github,
  Search,
  Zap,
  RefreshCcw,
  Radar,
  Bell,
  DollarSign,
  PanelsTopLeft,
  Settings,
  Cloud,
  Rocket,
  Hammer,
  Link2,
  Lightbulb,
  Flame,
  KeyRound,
  Newspaper,
  AtSign,
  Users,
  Timer,
  Scale,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  X,
  Sun,
  Moon,
  Leaf,
  Blocks,
  AppWindow,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

const navGroups = [
  {
    label: "Focus",
    hint: "Daily execution",
    items: [
      { id: "dashboard", label: "Today", icon: Home },
      { id: "tasks", label: "Tasks", icon: CheckSquare },
      { id: "projects", label: "Projects", icon: PanelsTopLeft },
      { id: "calendar", label: "Calendar", icon: Calendar },
      { id: "notes", label: "Notes", icon: FileText },
      { id: "demo", label: "Guided Demo", icon: WandSparkles },
    ],
  },
  {
    label: "Growth",
    hint: "Traffic & revenue",
    items: [
      { id: "websites", label: "Websites", icon: Globe },
      { id: "apps-funnels", label: "Apps & Funnels", icon: AppWindow },
      { id: "wp-manage", label: "WordPress", icon: Zap },
      { id: "seo", label: "SEO / AI Visibility", icon: Search },
      { id: "github", label: "GitHub Portfolio", icon: Github },
    ],
  },
  {
    label: "Operate",
    hint: "Review & control",
    items: [
      { id: "review", label: "Review", icon: RefreshCcw },
      { id: "decisions", label: "Findings", icon: Scale },
      { id: "control-center", label: "Captures", icon: Radar },
      { id: "reminders", label: "Reminders", icon: Bell },
      { id: "payments", label: "Finance", icon: DollarSign },
    ],
  },
];

const systemItems = [
  { id: "builds", label: "Build Projects", icon: Hammer },
  { id: "google-tasks", label: "Google Tasks", icon: CheckSquare },
  { id: "cloudflare", label: "Cloudflare", icon: Cloud },
  { id: "vercel", label: "Vercel", icon: Rocket },
  { id: "ideas", label: "Ideas", icon: Lightbulb },
  { id: "habits", label: "Habits", icon: Flame },
  { id: "credentials", label: "Credentials", icon: KeyRound },
  { id: "links", label: "Links Hub", icon: Link2 },
  { id: "industry", label: "Trends", icon: Newspaper },
  { id: "mentions", label: "Mentions", icon: AtSign },
  { id: "audience", label: "Audience", icon: Users },
  { id: "focus", label: "Focus Timer", icon: Timer },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const tasks = useTasks();
  const payments = usePayments();
  const ideas = useIdeas();
  const customModules = useCustomModules();
  const addItem = useAddItem();
  const {
    activeSection,
    setActiveSection,
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useNavigationStore();
  const { userName, userRole, theme, toggleTheme } = useSettingsStore();
  const area = usePlanStore((state) => state.area);

  const [systemsOpen, setSystemsOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [newModName, setNewModName] = useState("");
  const [newModEmoji, setNewModEmoji] = useState("📁");

  const openTasks = tasks.filter((t) => t.status !== "done").length;
  const overduePayments = payments.filter((p) => p.status === "overdue").length;
  const activeIdeas = ideas.filter((i) => i.status === "exploring" || i.status === "validated").length;

  const getBadge = (id: string) => {
    if (id === "tasks") return openTasks || null;
    if (id === "payments") return overduePayments || null;
    if (id === "ideas") return activeIdeas || null;
    return null;
  };

  const go = (id: string) => {
    setActiveSection(id);
    setSidebarOpen(false);
  };

  const addCustomModule = async () => {
    if (!newModName.trim()) return;
    const id = await addItem("customModules", {
      name: newModName.trim(),
      icon: newModEmoji,
      description: "",
      fields: [
        { key: "name", label: "Name", type: "text" },
        { key: "url", label: "URL", type: "url" },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
      data: [],
      createdAt: new Date().toISOString(),
      order: customModules.length,
      visible: true,
      color: "",
    });
    if (id) toast.success(`${newModName.trim()} added`);
    setNewModName("");
    setNewModEmoji("📁");
    setCustomOpen(false);
  };

  const collapsed = sidebarCollapsed;

  const familyGroup = {
    label: "Home",
    hint: "Simple daily life",
    items: [
      { id: "dashboard", label: "Today", icon: Home },
      { id: "tasks", label: "Tasks", icon: CheckSquare },
      { id: "calendar", label: "Calendar", icon: Calendar },
      { id: "reminders", label: "Reminders", icon: Bell },
      { id: "habits", label: "Habits", icon: Flame },
      { id: "notes", label: "Notes", icon: FileText },
      { id: "payments", label: "Finance", icon: DollarSign },
      { id: "ideas", label: "Ideas", icon: Lightbulb },
    ],
  };

  const visibleGroups = area === "personal" ? [familyGroup] : navGroups;

  const NavItem = ({
    item,
  }: {
    item: { id: string; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> };
  }) => {
    const active = activeSection === item.id;
    const badge = getBadge(item.id);
    return (
      <button
        type="button"
        onClick={() => go(item.id)}
        title={collapsed ? item.label : undefined}
        className={`mc13-nav-item group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-150 ${
          collapsed ? "justify-center px-0" : ""
        } ${
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_10px_28px_-16px_hsl(var(--sidebar-primary)/0.9)]"
            : "text-sidebar-foreground/68 hover:bg-sidebar-accent/75 hover:text-sidebar-accent-foreground"
        }`}
      >
        <item.icon size={17} strokeWidth={active ? 2.25 : 1.7} />
        {!collapsed && <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>}
        {badge && !collapsed && (
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${
            active ? "bg-white/16 text-current" : "bg-primary/10 text-primary"
          }`}>
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        {badge && collapsed && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
        )}
      </button>
    );
  };

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`mc13-sidebar fixed left-0 top-0 z-50 flex h-full flex-col border-r border-sidebar-border/70 bg-sidebar/96 text-sidebar-foreground shadow-[20px_0_70px_-55px_hsl(var(--foreground)/0.7)] backdrop-blur-2xl transition-all duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ width: collapsed ? 72 : 248 }}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="absolute right-4 top-4 rounded-lg p-2 text-sidebar-foreground/50 hover:bg-sidebar-accent lg:hidden"
          aria-label="Close navigation"
        >
          <X size={17} />
        </button>

        <div className={`flex h-[72px] items-center border-b border-sidebar-border/60 ${
          collapsed ? "justify-center px-3" : "gap-3 px-4"
        }`}>
          <div className="mc13-brand-mark grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl shadow-[var(--shadow-primary)]">
            <img src="/mission-control-mark.svg" alt="" className="h-10 w-10" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-[14px] font-extrabold tracking-tight">Mission Control</div>
              <div className="text-[10px] font-medium text-sidebar-foreground/42">Home. Work. One place.</div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="absolute -right-3.5 top-[88px] z-50 hidden h-7 w-7 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground/60 shadow-lg transition hover:text-sidebar-foreground lg:flex"
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-5">
            {visibleGroups.map((group) => (
              <section key={group.label}>
                {!collapsed && (
                  <div className="mb-1.5 px-3">
                    <div className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-sidebar-foreground/34">
                      {group.label}
                    </div>
                    <div className="mt-0.5 text-[9px] text-sidebar-foreground/26">{group.hint}</div>
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavItem key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ))}

            {area !== "personal" && (
            <section>
              <button
                type="button"
                onClick={() => setSystemsOpen((v) => !v)}
                className={`flex w-full items-center rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/40 transition hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/70 ${
                  collapsed ? "justify-center px-0" : "justify-between"
                }`}
                title={collapsed ? "Systems & tools" : undefined}
              >
                {collapsed ? (
                  <Blocks size={17} />
                ) : (
                  <>
                    <span className="flex items-center gap-2"><Blocks size={13} /> Systems & tools</span>
                    <ChevronDown size={13} className={systemsOpen ? "rotate-180 transition-transform" : "transition-transform"} />
                  </>
                )}
              </button>
              {systemsOpen && !collapsed && (
                <div className="mt-1 space-y-0.5 rounded-2xl border border-sidebar-border/40 bg-sidebar-accent/20 p-1.5">
                  {systemItems.map((item) => (
                    <NavItem key={item.id} item={item} />
                  ))}
                </div>
              )}
            </section>
            )}

            {area !== "personal" && customModules.filter((m) => m.visible).length > 0 && (
              <section>
                {!collapsed && (
                  <div className="mb-1.5 px-3 text-[9px] font-extrabold uppercase tracking-[0.18em] text-sidebar-foreground/34">
                    Custom
                  </div>
                )}
                <div className="space-y-0.5">
                  {customModules
                    .filter((m) => m.visible)
                    .sort((a, b) => a.order - b.order)
                    .map((mod) => {
                      const active = activeSection === `custom-${mod.id}`;
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => go(`custom-${mod.id}`)}
                          title={collapsed ? mod.name : undefined}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${
                            collapsed ? "justify-center px-0" : ""
                          } ${
                            active
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/65 hover:bg-sidebar-accent/70"
                          }`}
                        >
                          <span>{mod.icon}</span>
                          {!collapsed && <span className="truncate">{mod.name}</span>}
                        </button>
                      );
                    })}
                </div>
              </section>
            )}

            {!collapsed && area !== "personal" && (
              <section>
                {!customOpen ? (
                  <button
                    type="button"
                    onClick={() => setCustomOpen(true)}
                    className="flex w-full items-center gap-2 rounded-xl border border-dashed border-sidebar-border/70 px-3 py-2 text-[11px] font-semibold text-sidebar-foreground/38 transition hover:border-sidebar-primary/30 hover:text-sidebar-primary"
                  >
                    <Plus size={13} /> Add custom module
                  </button>
                ) : (
                  <div className="rounded-2xl border border-sidebar-border/60 bg-sidebar-accent/25 p-2.5">
                    <div className="flex gap-2">
                      <input
                        value={newModEmoji}
                        onChange={(e) => setNewModEmoji(e.target.value)}
                        className="w-10 rounded-xl bg-sidebar px-2 text-center text-sm outline-none"
                        aria-label="Module icon"
                      />
                      <input
                        value={newModName}
                        onChange={(e) => setNewModName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void addCustomModule();
                          if (e.key === "Escape") setCustomOpen(false);
                        }}
                        autoFocus
                        placeholder="Module name"
                        className="min-w-0 flex-1 rounded-xl bg-sidebar px-3 py-2 text-xs text-sidebar-foreground outline-none placeholder:text-sidebar-foreground/30"
                      />
                      <button
                        type="button"
                        onClick={() => void addCustomModule()}
                        disabled={!newModName.trim()}
                        className="grid w-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground disabled:opacity-30"
                      >
                        <Check size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        </nav>

        <div className="border-t border-sidebar-border/60 p-3">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 rounded-2xl bg-sidebar-accent/40 px-3 py-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-xs font-black text-primary-foreground">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold">{userName}</div>
                <div className="truncate text-[9px] text-sidebar-foreground/40">
                  {area === "personal" ? "Home mode" : area === "work" ? "Business mode" : userRole}
                </div>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-xl p-2 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                title={`Theme: ${theme}`}
              >
                {theme === "dark" ? <Sun size={14} /> : theme === "sage" ? <Leaf size={14} /> : <Moon size={14} />}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleTheme}
              className="grid w-full place-items-center rounded-xl py-2.5 text-sidebar-foreground/55 hover:bg-sidebar-accent"
              title={`Theme: ${theme}`}
            >
              {theme === "dark" ? <Sun size={15} /> : theme === "sage" ? <Leaf size={15} /> : <Moon size={15} />}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
