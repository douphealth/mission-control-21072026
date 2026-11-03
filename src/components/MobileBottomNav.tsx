import { CheckSquare, House, Inbox, LayoutGrid, CalendarDays } from "lucide-react";
import { useNavigationStore } from "@/stores/navigationStore";
import { usePlanStore } from "@/stores/planStore";

export default function MobileBottomNav() {
  const { activeSection, setActiveSection, sidebarOpen, setSidebarOpen } = useNavigationStore();
  const personal = usePlanStore((state) => state.area === "personal");
  const tabs = [
    { id: "dashboard", label: "Today", icon: House },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    {
      id: personal ? "calendar" : "control-center",
      label: personal ? "Calendar" : "Captures",
      icon: personal ? CalendarDays : Inbox,
    },
  ];
  return (
    <nav className="mc-mobile-nav lg:hidden" aria-label="Mobile navigation">
      {tabs.map((item) => (
        <button
          type="button"
          key={item.id}
          aria-current={activeSection === item.id && !sidebarOpen ? "page" : undefined}
          onClick={() => {
            setSidebarOpen(false);
            setActiveSection(item.id);
          }}
        >
          <item.icon size={21} strokeWidth={1.8} />
          <span>{item.label}</span>
        </button>
      ))}
      <button
        type="button"
        data-workspace-trigger
        aria-label="Open all workspaces"
        aria-haspopup="dialog"
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen(true)}
      >
        <LayoutGrid size={21} strokeWidth={1.8} />
        <span>Workspaces</span>
      </button>
    </nav>
  );
}
