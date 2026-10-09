import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PageTone } from "@/components/PageHeader";

/**
 * The empty state for every list, board and grid. A soft glyph, one clear sentence,
 * and the single next action. Styles live in mc-design-system.css.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "accent",
  compact = false,
  bare = false,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  tone?: PageTone;
  compact?: boolean;
  /** No border or backdrop, for use inside a panel that already has its own. */
  bare?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mc-empty",
        compact && "mc-empty--compact",
        bare && "mc-empty--bare",
        className,
      )}
      data-tone={tone}
      role="status"
    >
      <div className="mc-empty-glyph" aria-hidden>
        <Icon size={compact ? 20 : 26} strokeWidth={1.8} />
      </div>
      <h3 className="mc-empty-title">{title}</h3>
      {description && <p className="mc-empty-desc">{description}</p>}
      {action && <div className="mc-empty-action">{action}</div>}
    </div>
  );
}
