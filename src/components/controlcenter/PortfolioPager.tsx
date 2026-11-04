import { ChevronLeft, ChevronRight } from "lucide-react";
import { PORTFOLIO_PAGE_SIZES, type PortfolioPageSize } from "@/lib/portfolioPaging";

type Props = {
  id: string;
  page: number;
  pages: number;
  from: number;
  to: number;
  total: number;
  pageSize: PortfolioPageSize;
  onPage: (page: number) => void;
  onSize: (size: PortfolioPageSize) => void;
};

/** Stateless, accessible pagination shared by the two large operational inventories. */
export default function PortfolioPager({id,page,pages,from,to,total,pageSize,onPage,onSize}: Props) {
  return <nav aria-label={id + " pages"} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/65 px-3 py-2.5 text-xs">
    <span className="text-muted-foreground tabular-nums" aria-live="polite">
      {total ? `${from}–${to} of ${total} matching` : "No matching records"}
    </span>
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-muted-foreground">
        Rows per page
        <select value={pageSize} aria-label={id + " rows per page"}
          onChange={e=>onSize(Number(e.target.value) as PortfolioPageSize)}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-foreground">
          {PORTFOLIO_PAGE_SIZES.map(size=><option key={size} value={size}>{size}</option>)}
        </select>
      </label>
      <button type="button" className="btn-secondary !px-2" aria-label={id + " previous page"}
        disabled={page <= 1} onClick={()=>onPage(page-1)}><ChevronLeft size={16}/></button>
      <span className="min-w-14 text-center tabular-nums" aria-label={id + " page number"}>{page} / {pages}</span>
      <button type="button" className="btn-secondary !px-2" aria-label={id + " next page"}
        disabled={page >= pages} onClick={()=>onPage(page+1)}><ChevronRight size={16}/></button>
    </div>
  </nav>;
}
