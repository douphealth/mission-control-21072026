import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PageTone = "accent" | "sky" | "violet" | "amber" | "rose";

export interface PageHeaderStat {
  label: string;
  value: ReactNode;
  tone?: PageTone | "muted";
}

/**
 * One header for every module page: icon tile, eyebrow, title, a line of context,
 * a few live numbers and the page's actions. Styles live in mc-design-system.css.
 */
export default function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  tone = "accent",
  stats,
  actions,
  className,
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  tone?: PageTone;
  stats?: PageHeaderStat[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mc-pagehead", `mc-pagehead--${tone}`, className)}>
      <div className="mc-pagehead-main">
        <span className="mc-pagehead-icon" aria-hidden>
          <Icon size={20} strokeWidth={2} />
        </span>
        <div className="mc-pagehead-copy">
          {eyebrow && <div className="mc-pagehead-eyebrow">{eyebrow}</div>}
          <h1 className="mc-pagehead-title">{title}</h1>
          {subtitle && <p className="mc-pagehead-subtitle">{subtitle}</p>}
        </div>
      </div>

      {stats && stats.length > 0 && (
        <dl className="mc-pagehead-stats">
          {stats.map((stat) => (
            <div key={stat.label} className="mc-pagehead-stat" data-tone={stat.tone ?? "muted"}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {actions && <div className="mc-pagehead-actions">{actions}</div>}
    </header>
  );
}
