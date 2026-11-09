import { House, LayoutGrid, ListTodo, Wallet, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceLayout } from "@/hooks/useWorkspaceLayout";
import { useNavigationStore } from "@/stores/navigationStore";

export default function MobileBottomNav() {
  const { activeSection, setActiveSection, sidebarOpen, setSidebarOpen, recentSections } = useNavigationStore();
  const { visible } = useWorkspaceLayout();
  const tabs = [
    { id: "dashboard", label: "Today", icon: House },
    { id: "tasks", label: "Tasks", icon: ListTodo },
    { id: "payments", label: "Finance", icon: Wallet },
    ...recentSections.filter(id => !["dashboard", "tasks", "payments", activeSection].includes(id) && visible.some(s => s.id === id)).slice(0, 1).map(id => ({ id, label: "Previous", icon: ArrowLeftRight })),
  ].filter(item => visible.some(section => section.id === item.id));
  return (
    <nav className="mc-mobile-nav lg:hidden" aria-label="Mobile navigation">
      {tabs.map((item) => (
        <Button variant="ghost"
          type="button"
          key={item.id}
          aria-current={(activeSection === item.id || (item.id === "credentials" && activeSection === "family-vault")) && !sidebarOpen ? "page" : undefined}
          onClick={() => {
            setSidebarOpen(false);
            setActiveSection(item.id);
          }}
        >
          <item.icon size={21} strokeWidth={1.8} />
          <span>{item.label}</span>
        </Button>
      ))}
      <Button variant="ghost"
        type="button"
        data-workspace-trigger
        aria-label="Open all sections"
        aria-haspopup="dialog"
        aria-expanded={sidebarOpen}
        aria-current={!tabs.some(item => item.id === activeSection) && activeSection !== "family-vault" && !sidebarOpen ? "page" : undefined}
        onClick={() => setSidebarOpen(true)}
      >
        <LayoutGrid size={21} strokeWidth={1.8} />
        <span>Menu</span>
      </Button>
    </nav>
  );
}
