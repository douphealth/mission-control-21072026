import { AlertTriangle, CheckSquare, Github, Globe2, Search } from "lucide-react";
import { useSEOIssues, useTasks, useWebsites } from "@/hooks/useTableData";
import { useNavigationStore } from "@/stores/navigationStore";
import { todayISO } from "@/lib/overdue";
import { GITHUB_REPO_CATALOG_COUNT } from "@/lib/repoCatalog";

export default function MissionPulseStrip() {
  const tasks = useTasks();
  const websites = useWebsites();
  const seoIssues = useSEOIssues();
  const setActiveSection = useNavigationStore((s) => s.setActiveSection);
  const today = todayISO();

  const openTasks = tasks.filter((t) => t.status !== "done");
  const overdue = openTasks.filter((t) => t.dueDate && t.dueDate < today).length;
  const dueToday = openTasks.filter((t) => t.dueDate === today).length;
  const activeSites = websites.filter((w) => w.status === "active").length;
  const unhealthySites = websites.filter((w) => w.status === "down" || w.status === "maintenance").length;
  const openSearchIssues = seoIssues.filter((i) => i.status === "open" || i.status === "in-progress");
  const criticalSearch = openSearchIssues.filter(
    (i) => i.severity === "critical" || i.severity === "high",
  ).length;

  const cards = [
    {
      id: "tasks",
      label: "Execution",
      value: openTasks.length,
      note:
        overdue > 0
          ? `${overdue} overdue · ${dueToday} due today`
          : dueToday > 0
            ? `${dueToday} due today`
            : "No overdue work",
      icon: CheckSquare,
      tone: overdue > 0 ? "danger" : "primary",
    },
    {
      id: "websites",
      label: "Website portfolio",
      value: activeSites,
      note:
        unhealthySites > 0
          ? `${unhealthySites} need attention`
          : `${websites.length} tracked · portfolio stable`,
      icon: Globe2,
      tone: unhealthySites > 0 ? "warning" : "good",
    },
    {
      id: "seo",
      label: "Search growth",
      value: openSearchIssues.length,
      note:
        criticalSearch > 0 ? `${criticalSearch} critical/high issues` : "No critical growth issues",
      icon: Search,
      tone: criticalSearch > 0 ? "warning" : "info",
    },
    {
      id: "github",
      label: "GitHub portfolio",
      value: GITHUB_REPO_CATALOG_COUNT,
      note: "Prioritized repository catalog",
      icon: Github,
      tone: "violet",
    },
  ] as const;

  return (
    <section aria-label="Mission pulse" className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={() => setActiveSection(card.id)}
          className="mission-pulse-card group text-left"
          data-tone={card.tone}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="mission-pulse-icon">
              <card.icon size={16} strokeWidth={2} />
            </div>
            {(card.tone === "danger" || card.tone === "warning") && (
              <AlertTriangle size={13} className="mt-1 text-current opacity-65" />
            )}
          </div>
          <div className="mt-3 flex items-end gap-2">
            <div className="font-display text-[24px] font-black leading-none tracking-tight sm:text-[28px]">
              {card.value}
            </div>
            <div className="pb-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] opacity-55">
              {card.label}
            </div>
          </div>
          <p className="mt-2 truncate text-[10.5px] font-medium opacity-60">{card.note}</p>
        </button>
      ))}
    </section>
  );
}
