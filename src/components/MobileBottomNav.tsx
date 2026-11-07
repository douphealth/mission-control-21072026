import { House, LayoutGrid, Github, Cloud, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigationStore } from "@/stores/navigationStore";

export default function MobileBottomNav() {
  const { activeSection, setActiveSection, sidebarOpen, setSidebarOpen } = useNavigationStore();
  const tabs = [
    { id: "dashboard", label: "Today", icon: House },
    { id: "github", label: "GitHub", icon: Github },
    { id: "cloudflare", label: "Cloudflare", icon: Cloud },
    { id: "credentials", label: "Vault", icon: KeyRound },
  ];
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
