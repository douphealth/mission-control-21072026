import { useCallback, useMemo, useRef, useState } from 'react';

type VirtualizerOptions = {
  count: number;
  getScrollElement: () => HTMLElement | null;
  estimateSize: (index?: number) => number;
  overscan?: number;
};

export type VirtualItem = {
  key: number;
  index: number;
  start: number;
  end: number;
  size: number;
};

/**
 * Minimal compatibility layer for the subset of @tanstack/react-virtual used
 * by TasksPage. It keeps variable-height rows positioned correctly and avoids
 * a production dependency that was missing from the repository manifest.
 */
export function useVirtualizer(options: VirtualizerOptions) {
  const measuredSizes = useRef(new Map<number, number>());
  const [, refresh] = useState(0);

  const virtualItems = useMemo<VirtualItem[]>(() => {
    let start = 0;
    return Array.from({ length: options.count }, (_, index) => {
      const size = measuredSizes.current.get(index) ?? options.estimateSize(index);
      const item = { key: index, index, start, end: start + size, size };
      start += size;
      return item;
    });
  }, [options.count, options.estimateSize]);

  const measureElement = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    const rawIndex = element.dataset.index;
    if (rawIndex === undefined) return;
    const index = Number(rawIndex);
    if (!Number.isFinite(index)) return;

    const nextSize = Math.max(1, Math.ceil(element.getBoundingClientRect().height));
    if (measuredSizes.current.get(index) !== nextSize) {
      measuredSizes.current.set(index, nextSize);
      refresh(value => value + 1);
    }
  }, []);

  return {
    getVirtualItems: () => virtualItems,
    getTotalSize: () => virtualItems.at(-1)?.end ?? 0,
    measureElement,
  };
}
