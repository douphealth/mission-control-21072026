import { forwardRef, lazy, Suspense, useEffect, useState } from "react";
import {
  Bell,
  ChevronRight,
  Download,
  History,
  LayoutGrid,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Sun,
  Upload,
  Rows3,
  Rows4,
} from "lucide-react";
import { toast } from "sonner";
import { useTasks, useExportAllData } from "@/hooks/useTableData";
import { useNavigationStore } from "@/stores/navigationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { todayISO } from "@/lib/overdue";
import { workspaceById } from "@/lib/workspaceCatalog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CommandPalette = lazy(() => import("./CommandPalette"));
const BulkImportModal = lazy(() => import("./BulkImportModal"));
const VersionsModal = lazy(() => import("./VersionsModal"));
const QuickCaptureBar = lazy(() => import("./dashboard/QuickCaptureBar"));

const TopBar = forwardRef<HTMLElement>(function TopBar(_props, ref) {
  const tasks = useTasks();
  const exportAllData = useExportAllData();
  const { resolvedTheme, toggleDayNight } = useSettingsStore();
  const {
    activeSection,
    setSidebarOpen,
    setActiveSection,
    setFocusTaskId,
    commandPaletteOpen,
    setCommandPaletteOpen,
    importModalOpen,
    setImportModalOpen,
    density,
    setDensity,
  } = useNavigationStore();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [today, setToday] = useState(todayISO);
  const section = workspaceById(activeSection);
  const shortcut =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "")
      ? "⌘ K"
      : "Ctrl K";
  const due = tasks
    .filter(
      (task) => task.status !== "done" && !task.archived && task.dueDate && task.dueDate <= today,
    )
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

  useEffect(() => {
    const interval = window.setInterval(() => setToday(todayISO()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      // Do not open another keyboard-driven overlay inside an active modal.
      const dialogOpen = !!document.querySelector('[role="dialog"], [role="alertdialog"]');
      if (dialogOpen) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
      const element = document.activeElement as HTMLElement | null;
      const typing =
        !!element && (element.matches("input, textarea, select") || element.isContentEditable);
      if (
        !typing &&
        !dialogOpen &&
        event.key.toLowerCase() === "n" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        setCaptureOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setCommandPaletteOpen]);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const data = await exportAllData();
      const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `mission-control-backup-${todayISO()}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      toast.success("Backup download started");
    } catch (error) {
      toast.error("Backup could not be exported", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again. Saved records have not been changed.",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <header ref={ref} className="mc-topbar">
        <button
          type="button"
          className="mc-icon-button lg:hidden"
          data-workspace-trigger
          aria-label="Open navigation"
          aria-haspopup="dialog"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={20} />
        </button>
        <div className="mc-breadcrumb" aria-label="Current workspace">
          <span>{section?.group ?? "Workspace"}</span>
          <ChevronRight size={14} />
          <strong>{section?.label ?? "Custom workspace"}</strong>
        </div>
        <button
          type="button"
          className="mc-command-search"
          aria-label="Search everything"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search size={17} />
          <span>Search anything…</span>
          <kbd>{shortcut}</kbd>
        </button>
        <div className="mc-topbar-actions">
          <button
            type="button"
            className="mc-icon-button"
            onClick={toggleDayNight}
            aria-label={resolvedTheme === "dark" ? "Switch to day mode" : "Switch to night mode"}
            title={resolvedTheme === "dark" ? "Day mode" : "Night mode"}
          >
            {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="mc-icon-button mc-notifications-trigger"
                aria-label={`${due.length} tasks due or overdue`}
                title="Tasks needing attention"
              >
                <Bell size={18} />
                {due.length > 0 && <span>{due.length > 9 ? "9+" : due.length}</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="mc-notifications">
              <div className="mc-popover-heading">
                <strong>Needs your attention</strong>
                <span>{due.length} tasks</span>
              </div>
              {due.length === 0 ? (
                <p className="mc-popover-empty">No open tasks are due today or overdue.</p>
              ) : (
                <div className="mc-notifications-list">
                  {due.slice(0, 10).map((task) => (
                    <button
                      type="button"
                      key={task.id}
                      onClick={() => {
                        setFocusTaskId(task.id);
                        setActiveSection("tasks");
                        setNotifOpen(false);
                      }}
                    >
                      <strong>{task.title}</strong>
                      <span data-overdue={task.dueDate! < today}>
                        {task.dueDate! < today ? "Overdue · " : "Due today · "}
                        {task.dueDate}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="mc-popover-link"
                onClick={() => {
                  setActiveSection("tasks");
                  setNotifOpen(false);
                }}
              >
                View all tasks <ChevronRight size={15} />
              </button>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="mc-icon-button mc-more-actions"
                aria-label="Workspace actions"
              >
                <MoreHorizontal size={19} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuLabel>Workspace actions</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setSidebarOpen(true)}>
                <LayoutGrid size={16} />
                All workspaces
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setDensity(density === "comfortable" ? "compact" : "comfortable")}
              >
                {density === "comfortable" ? <Rows4 size={16} /> : <Rows3 size={16} />}
                {density === "comfortable" ? "Use compact layout" : "Use comfortable layout"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setImportModalOpen(true)}>
                <Upload size={16} />
                Import records
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setVersionsOpen(true)}>
                <History size={16} />
                Version history
              </DropdownMenuItem>
              <DropdownMenuItem disabled={exporting} onSelect={() => void handleExport()}>
                <Download size={16} />
                {exporting ? "Preparing backup…" : "Export backup"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            className="mc-capture-button"
            aria-label="Quick capture"
            onClick={() => setCaptureOpen(true)}
          >
            <Plus size={18} />
            <span>Quick capture</span>
            <kbd>N</kbd>
          </button>
        </div>
      </header>
      <Dialog open={captureOpen} onOpenChange={setCaptureOpen}>
        <DialogContent className="mc-capture-dialog">
          <DialogTitle>Get it out of your head.</DialogTitle>
          <DialogDescription>
            Capture a task, reminder, note, idea or link. Review the interpreted details before
            saving.
          </DialogDescription>
          <Suspense fallback={<p role="status">Opening capture…</p>}>
            <QuickCaptureBar autoFocus />
          </Suspense>
          <div className="mc-capture-help">
            <span>
              <kbd>&gt;</kbd> Task
            </span>
            <span>
              <kbd>@</kbd> Reminder
            </span>
            <span>
              <kbd>#</kbd> Note
            </span>
            <span>
              <kbd>!</kbd> Idea
            </span>
            <span>Paste a URL to save a link</span>
          </div>
        </DialogContent>
      </Dialog>
      <Suspense fallback={null}>
        {commandPaletteOpen && (
          <CommandPalette
            open
            onClose={() => setCommandPaletteOpen(false)}
            onImport={() => setImportModalOpen(true)}
          />
        )}
        {importModalOpen && <BulkImportModal open onClose={() => setImportModalOpen(false)} />}
        {versionsOpen && <VersionsModal open onClose={() => setVersionsOpen(false)} />}
      </Suspense>
    </>
  );
});
export default TopBar;
