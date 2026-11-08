import { Layers3 } from "lucide-react";
import { useCustomModules } from "@/hooks/useTableData";
import { useNavigationStore } from "@/stores/navigationStore";
import { WORKSPACE_SECTIONS, type WorkspaceSection } from "@/lib/workspaceCatalog";
import { defaultSidebarLayout, orderedSections } from "@/lib/sidebarLayout";

export function useWorkspaceLayout() {
  const custom = useCustomModules();
  const saved = useNavigationStore(state => state.sidebarLayout);
  const layout = saved ?? defaultSidebarLayout();
  const all: WorkspaceSection[] = [...WORKSPACE_SECTIONS, ...custom.filter(m => m.visible).sort((a, b) => a.order - b.order).map(m => ({
    id: `custom-${m.id}`, label: m.name, description: m.description || "Custom workspace", group: "Custom" as const, icon: Layers3,
  }))];
  return { all, layout, visible: orderedSections(all, layout) };
}