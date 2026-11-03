import { useEffect, useState, type FormEvent } from "react";
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Layers3,
  Plus,
  Search,
  Settings,
  Pin,
} from "lucide-react";
import { toast } from "sonner";
import { useTasks, usePayments, useCustomModules, useAddItem } from "@/hooks/useTableData";
import { useNavigationStore } from "@/stores/navigationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { usePlanStore } from "@/stores/planStore";
import { dueState, localToday } from "@/lib/financeLedger";
import {
  WORKSPACE_GROUPS,
  WORKSPACE_SECTIONS,
  filterWorkspaces,
  workspaceById,
  type WorkspaceSection,
} from "@/lib/workspaceCatalog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import AreaSwitch from "@/components/AreaSwitch";

export default function Sidebar() {
  const tasks = useTasks();
  const payments = usePayments();
  const custom = useCustomModules();
  const addItem = useAddItem();
  const {
    activeSection,
    setActiveSection,
    sidebarCollapsed: collapsed,
    setSidebarCollapsed,
    setSidebarOpen,
    pinnedSections,
    closedGroups,
    setClosedGroups,
  } = useNavigationStore();
  const { userName, userRole } = useSettingsStore();
  const area = usePlanStore((state) => state.area);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const customSections: WorkspaceSection[] = custom
    .filter((module) => module.visible)
    .sort((a, b) => a.order - b.order)
    .map((module) => ({
      id: `custom-${module.id}`,
      label: module.name,
      description: module.description || "Custom workspace",
      group: "Custom",
      icon: Layers3,
    }));
  const sections = filterWorkspaces(
    [...WORKSPACE_SECTIONS, ...customSections],
    "",
    area === "personal",
  );
  const taskCount = tasks.filter((task) => task.status !== "done" && !task.archived).length;
  const financeCount = payments.filter(
    (payment) => dueState(payment, localToday()) === "overdue",
  ).length;
  const badge = (id: string) => (id === "tasks" ? taskCount : id === "payments" ? financeCount : 0);
  useEffect(() => {
    const group = workspaceById(activeSection)?.group;
    if (group)
      setClosedGroups(
        useNavigationStore.getState().closedGroups.filter((value) => value !== group),
      );
  }, [activeSection, setClosedGroups]);

  const addModule = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const id = await addItem("customModules", {
        name: name.trim(),
        icon: "📁",
        description: "",
        fields: [
          { key: "name", label: "Name", type: "text" },
          { key: "url", label: "URL", type: "url" },
          { key: "notes", label: "Notes", type: "textarea" },
        ],
        data: [],
        createdAt: new Date().toISOString(),
        order: custom.length,
        visible: true,
        color: "",
      });
      if (!id) throw new Error("No saved workspace was returned.");
      setAdding(false);
      setName("");
      setActiveSection(`custom-${id}`);
      toast.success("Workspace created");
    } catch (error) {
      toast.error("Workspace was not saved", {
        description:
          error instanceof Error ? error.message : "Please try again. Your name is still here.",
      });
    } finally {
      setSaving(false);
    }
  };

  const navItem = (item: WorkspaceSection) => (
    <button
      key={item.id}
      type="button"
      className="mc-nav-link"
      aria-current={activeSection === item.id ? "page" : undefined}
      aria-label={item.label}
      title={collapsed ? item.label : item.description}
      onClick={() => setActiveSection(item.id)}
    >
      <item.icon size={18} strokeWidth={activeSection === item.id ? 2.1 : 1.7} aria-hidden="true" />
      {!collapsed && (
        <>
          <span>{item.label}</span>
          {badge(item.id) > 0 && (
            <small className={item.id === "payments" ? "is-warning" : ""}>
              {badge(item.id) > 99 ? "99+" : badge(item.id)}
            </small>
          )}
        </>
      )}
    </button>
  );

  return (
    <>
      <aside className="mc-sidebar" data-collapsed={collapsed} aria-label="Main navigation">
        <div className="mc-sidebar-brand">
          <span className="mc-brand-symbol">
            <Layers3 size={23} strokeWidth={1.8} />
          </span>
          {!collapsed && (
            <span>
              <strong>Mission Control</strong>
              <small>THE OPERATOR'S WORKSPACE</small>
            </span>
          )}
        </div>
        <div className="mc-sidebar-controls">
          <button
            type="button"
            data-workspace-trigger
            className="mc-sidebar-search"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open workspace directory"
            title="Find any workspace"
          >
            <Search size={17} />
            {!collapsed && (
              <>
                <span>Find a workspace</span>
                <Layers3 size={14} />
              </>
            )}
          </button>
          {!collapsed && <AreaSwitch compact className="mc-sidebar-area" />}
        </div>
        <nav className="mc-sidebar-scroll" aria-label="Workspaces">
          {pinnedSections.some((id) => sections.some((item) => item.id === id)) && (
            <section className="mc-nav-group mc-nav-pinned" aria-label="Pinned workspaces">
              {!collapsed && (
                <div className="mc-nav-group-label">
                  <span>
                    <Pin size={12} /> Pinned
                  </span>
                  <button
                    type="button"
                    aria-label="Manage pinned workspaces"
                    onClick={() => setSidebarOpen(true)}
                  >
                    Edit
                  </button>
                </div>
              )}
              {pinnedSections
                .map((id) => sections.find((item) => item.id === id))
                .filter((item): item is WorkspaceSection => !!item)
                .map(navItem)}
            </section>
          )}
          {WORKSPACE_GROUPS.filter((group) => group !== "Custom").map((group) => {
            const items = sections.filter(
              (section) => section.group === group && !pinnedSections.includes(section.id),
            );
            if (!items.length) return null;
            const isOpen = collapsed || !closedGroups.includes(group);
            return (
              <section key={group} className="mc-nav-group">
                {!collapsed ? (
                  <button
                    type="button"
                    className="mc-nav-group-toggle"
                    aria-expanded={isOpen}
                    aria-controls={`nav-group-${group}`}
                    onClick={() =>
                      setClosedGroups(
                        closedGroups.includes(group)
                          ? closedGroups.filter((value) => value !== group)
                          : [...closedGroups, group],
                      )
                    }
                  >
                    <span>
                      {group}
                      <small>
                        {group === "Operate"
                          ? "Review & control"
                          : group === "Intelligence"
                            ? "Signals & evidence"
                            : group === "Growth"
                              ? "Assets & performance"
                              : group === "Focus"
                                ? "Plan & execute"
                                : "Connections & tools"}
                      </small>
                    </span>
                    <ChevronDown size={13} className={isOpen ? "" : "is-closed"} />
                  </button>
                ) : (
                  <div className="mc-nav-divider" />
                )}
                {isOpen && <div id={`nav-group-${group}`}>{items.map(navItem)}</div>}
              </section>
            );
          })}
          {area !== "personal" &&
            customSections.some((section) => !pinnedSections.includes(section.id)) && (
              <section className="mc-nav-group">
                {!collapsed && <div className="mc-nav-group-label">Custom</div>}
                {customSections
                  .filter((section) => !pinnedSections.includes(section.id))
                  .map(navItem)}
              </section>
            )}
          <button
            type="button"
            className="mc-sidebar-add"
            onClick={() => setAdding(true)}
            aria-label="Create a custom workspace"
            title="Create a custom workspace"
          >
            <Plus size={16} />
            {!collapsed && "Add workspace"}
          </button>
        </nav>
        <div className="mc-sidebar-footer">
          <button
            type="button"
            className="mc-sidebar-profile"
            title="Open settings"
            aria-label="Open settings"
            onClick={() => setActiveSection("settings")}
          >
            <span className="mc-user-initial">{userName.slice(0, 1).toUpperCase()}</span>
            {!collapsed && (
              <span>
                <strong>{userName}</strong>
                <small>{userRole || "Personal workspace"}</small>
              </span>
            )}
            {!collapsed && <Settings size={16} />}
          </button>
          <button
            type="button"
            className="mc-sidebar-collapse"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={() => setSidebarCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronsRight size={17} />
            ) : (
              <>
                <ChevronsLeft size={17} />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogTitle>Create a workspace</DialogTitle>
          <DialogDescription>Add a flexible space for records, links and notes.</DialogDescription>
          <form onSubmit={(event) => void addModule(event)} className="space-y-4">
            <label className="grid gap-2 text-sm font-medium">
              Workspace name
              <input
                autoFocus
                required
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-lg border border-border bg-background p-3"
              />
            </label>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="btn-primary min-h-11 w-full"
            >
              {saving ? "Creating…" : "Create workspace"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
