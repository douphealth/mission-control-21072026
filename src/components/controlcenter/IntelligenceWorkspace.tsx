import type { ReactNode } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import "./intelligence-workspace.css";

type Metric = {
  label: string;
  value: string | number;
  hint: string;
  tone?: "accent" | "success" | "warning";
  onClick?: () => void;
  active?: boolean;
};

export function IntelligenceMetrics({ items }: { items: Metric[] }) {
  return (
    <section className="intel-metrics" aria-label="Workspace summary">
      {items.map((item) => {
        const content = (
          <>
            <span className="intel-metric-label">
              {item.label}
              {item.onClick && <ArrowUpRight size={14} aria-hidden="true" />}
            </span>
            <strong className="intel-metric-value">{item.value}</strong>
            <span className="intel-metric-hint">{item.hint}</span>
          </>
        );
        return item.onClick ? (
          <button
            key={item.label}
            type="button"
            className="intel-metric"
            data-tone={item.tone}
            aria-pressed={item.active}
            onClick={item.onClick}
          >
            {content}
          </button>
        ) : (
          <div key={item.label} className="intel-metric" data-tone={item.tone}>
            {content}
          </div>
        );
      })}
    </section>
  );
}

export function IntelligenceTabs<T extends string>({
  value,
  onChange,
  items,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  items: Array<{ id: T; label: string; count?: number; icon?: ReactNode }>;
  label: string;
}) {
  return (
    <nav className="intel-tabs" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.count !== undefined && (
            <span className="intel-tab-count">{item.count.toLocaleString("en-US")}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

export function IntelligenceHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="intel-section-heading">
      <div className="min-w-0">
        {eyebrow && <p className="intel-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <div className="intel-description">{description}</div>}
      </div>
      {actions && <div className="intel-heading-actions">{actions}</div>}
    </div>
  );
}

export function IntelligenceEmpty({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="intel-empty">
      <div className="intel-empty-mark" aria-hidden="true">
        <ChevronRight size={24} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <button type="button" className="btn-secondary" onClick={onAction}>
        {action}
        <ArrowUpRight size={15} />
      </button>
    </div>
  );
}

/** Export only the user's visible records; protect text cells from spreadsheet formula evaluation. */
export function downloadIntelligenceCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | undefined | null>>,
) {
  const cell = (value: string | number | undefined | null) => {
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
    const raw = String(value ?? "");
    const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const csv = [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
