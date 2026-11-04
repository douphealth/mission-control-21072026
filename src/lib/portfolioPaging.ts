/** Bounded presentation only. Filtering, exports, and provider counts use the complete dataset. */
export const PORTFOLIO_PAGE_SIZES = [25, 50, 100] as const;
export type PortfolioPageSize = typeof PORTFOLIO_PAGE_SIZES[number];

export function portfolioPage<T>(rows: readonly T[], requestedPage: number, requestedSize: number) {
  const pageSize: PortfolioPageSize = PORTFOLIO_PAGE_SIZES.includes(requestedSize as PortfolioPageSize)
    ? requestedSize as PortfolioPageSize : 50;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Number.isFinite(requestedPage)
    ? Math.min(pages, Math.max(1, Math.floor(requestedPage))) : 1;
  const firstIndex = (page - 1) * pageSize;
  return {
    items: rows.slice(firstIndex, firstIndex + pageSize),
    page,
    pages,
    pageSize,
    total: rows.length,
    from: rows.length ? firstIndex + 1 : 0,
    to: Math.min(rows.length, firstIndex + pageSize),
  };
}
