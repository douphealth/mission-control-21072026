import { useMemo, useRef, useState } from "react";
import { ArrowUpRight, Layers3, Pin, PinOff, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import AreaSwitch from "@/components/AreaSwitch";
import { useCustomModules } from "@/hooks/useTableData";
import { useNavigationStore } from "@/stores/navigationStore";
import { usePlanStore } from "@/stores/planStore";
import {
  filterWorkspaces,
  WORKSPACE_GROUPS,
  WORKSPACE_SECTIONS,
  type WorkspaceSection,
} from "@/lib/workspaceCatalog";

/** The same directory serves the mobile menu, More button and desktop launcher. */
export default function WorkspaceDirectory() {
  const {
    sidebarOpen: open,
    setSidebarOpen,
    activeSection,
    setActiveSection,
    pinnedSections,
    togglePinnedSection,
  } = useNavigationStore();
  const { area, setArea } = usePlanStore();
  const custom = useCustomModules();
  const [query, setQuery] = useState("");
  const opener = useRef<HTMLElement | null>(null);
  const navigated = useRef(false);
  const all = useMemo<WorkspaceSection[]>(
    () => [
      ...WORKSPACE_SECTIONS,
      ...custom
        .filter((module) => module.visible)
        .sort((a, b) => a.order - b.order)
        .map((module) => ({
          id: `custom-${module.id}`,
          label: module.name,
          description: module.description || "Manage your custom workspace records.",
          group: "Custom" as const,
          icon: Layers3,
        })),
    ],
    [custom],
  );
  const results = filterWorkspaces(all, query, area === "personal");
  const unavailablePins = pinnedSections.filter((id) => !all.some((section) => section.id === id));
  const close = (next: boolean) => {
    setSidebarOpen(next);
    if (!next) setQuery("");
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        className="mc-directory"
        onOpenAutoFocus={() => {
          opener.current = document.activeElement as HTMLElement | null;
          navigated.current = false;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (!navigated.current && opener.current?.isConnected)
            opener.current.focus({ preventScroll: true });
          else document.getElementById("main-content")?.focus({ preventScroll: true });
        }}
      >
        <div className="mc-directory-head">
          <div className="mc-directory-eyebrow">
            <Layers3 size={15} /> YOUR WORKSPACE
          </div>
          <DialogTitle className="mc-directory-title">Everything, in one place.</DialogTitle>
          <DialogDescription>
            Choose a workspace. Pin up to eight favorites to your sidebar.
          </DialogDescription>
          <div className="mc-directory-search-row">
            <label className="mc-directory-search">
              <Search size={18} aria-hidden="true" />
              <input
                autoFocus
                aria-label="Find a workspace"
                placeholder="Search workspaces, tools or a purpose…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear workspace search"
                  onClick={() => setQuery("")}
                >
                  <X size={16} />
                </button>
              )}
            </label>
            <AreaSwitch compact />
          </div>
          <p className="mc-directory-count" role="status">
            {results.length} {results.length === 1 ? "workspace" : "workspaces"}
            {area === "personal" ? " in Home view" : " available"}
            {query ? ` matching “${query}”` : ""}
          </p>
        </div>
        <div className="mc-directory-scroll">
          {unavailablePins.length > 0 && (
            <section className="mc-directory-group" aria-label="Unavailable pinned workspaces">
              <h3>
                Unavailable pins<span>{unavailablePins.length}</span>
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                These workspaces may be hidden, removed, or still loading. You can free their pinned
                slots.
              </p>
              <div className="flex flex-wrap gap-2">
                {unavailablePins.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="btn-ghost"
                    onClick={() => togglePinnedSection(id)}
                  >
                    <PinOff size={14} />
                    Unpin {id.replace(/^custom-/, "custom workspace ")}
                  </button>
                ))}
              </div>
            </section>
          )}
          {WORKSPACE_GROUPS.map((group) => {
            const items = results.filter((section) => section.group === group);
            return (
              items.length > 0 && (
                <section
                  key={group}
                  aria-label={`${group} workspaces`}
                  className="mc-directory-group"
                >
                  <h3>
                    {group}
                    <span>{items.length}</span>
                  </h3>
                  <div className="mc-directory-grid">
                    {items.map((item) => (
                      <div key={item.id} className="mc-directory-entry">
                        <button
                          type="button"
                          key={item.id}
                          className="mc-directory-item"
                          aria-current={activeSection === item.id ? "page" : undefined}
                          onClick={() => {
                            navigated.current = true;
                            setActiveSection(item.id);
                            close(false);
                          }}
                        >
                          <span className="mc-directory-icon">
                            <item.icon size={20} />
                          </span>
                          <span className="mc-directory-copy">
                            <strong>{item.label}</strong>
                            <span>{item.description}</span>
                          </span>
                          <ArrowUpRight size={16} className="mc-directory-arrow" />
                        </button>
                        <button
                          type="button"
                          className="mc-directory-pin"
                          aria-label={`${pinnedSections.includes(item.id) ? "Unpin" : "Pin"} ${item.label}`}
                          aria-pressed={pinnedSections.includes(item.id)}
                          disabled={!pinnedSections.includes(item.id) && pinnedSections.length >= 8}
                          title={
                            pinnedSections.includes(item.id)
                              ? "Remove from pinned"
                              : pinnedSections.length >= 8
                                ? "Unpin a workspace before adding another"
                                : "Pin to sidebar"
                          }
                          onClick={() => togglePinnedSection(item.id)}
                        >
                          {pinnedSections.includes(item.id) ? (
                            <PinOff size={16} />
                          ) : (
                            <Pin size={16} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )
            );
          })}
          {results.length === 0 && (
            <div className="mc-directory-empty">
              <Search size={28} />
              <h3>No matching workspace</h3>
              <p>Try a section name such as Finance or a purpose such as reminders.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setArea("all");
                }}
              >
                Show all workspaces
              </button>
            </div>
          )}
        </div>
        <div className="mc-directory-footer">
          <span>Home and Business are view filters.</span>
          {area === "personal" && (
            <button type="button" onClick={() => setArea("all")}>
              Show all workspaces <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
