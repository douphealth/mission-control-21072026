import { WORKSPACE_SECTIONS, workspaceById } from "@/lib/workspaceCatalog";
import { useNavigationStore } from "@/stores/navigationStore";

export default function WorkspaceSectionNav() {
  const { activeSection, setActiveSection } = useNavigationStore();
  const group = workspaceById(activeSection)?.group;
  if (group !== "Intelligence" && group !== "Operate") return null;
  return (
    <nav className="mc-section-nav" aria-label={`${group} sections`}>
      {WORKSPACE_SECTIONS.filter((section) => section.group === group).map((section) => (
        <button
          type="button"
          key={section.id}
          aria-current={activeSection === section.id ? "page" : undefined}
          onClick={() => setActiveSection(section.id)}
        >
          <section.icon size={16} />
          <span>{section.label}</span>
        </button>
      ))}
    </nav>
  );
}
