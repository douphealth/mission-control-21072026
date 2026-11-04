/**
 * Pure helpers shared by the GitHub and Cloudflare operator consoles.
 * Nothing here touches the DOM, storage or the network, so it is fully unit-testable.
 */

export type ConsoleDensity = "comfortable" | "compact";

/** Browsers block bursts of popups; opening more than this at once also floods the operator. */
export const BULK_OPEN_LIMIT = 8;

/** Move a keyboard cursor through a list. `-1` means "no row focused yet". */
export function moveIndex(current: number, delta: number, length: number): number {
  if (length <= 0) return -1;
  if (current < 0) return delta >= 0 ? 0 : length - 1;
  return Math.min(length - 1, Math.max(0, current + delta));
}

/** Keep a cursor valid after the list shrinks (filters, refresh). */
export function clampIndex(index: number, length: number): number {
  if (length <= 0) return -1;
  return Math.min(index, length - 1);
}

/** Unique, http(s)-only URLs in first-seen order. Anything else is dropped, never opened. */
export function safeUrls(urls: ReadonlyArray<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    if (!raw) continue;
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      if (seen.has(url.href)) continue;
      seen.add(url.href);
      out.push(url.href);
    } catch {
      /* not a URL */
    }
  }
  return out;
}

/** Split a URL list into what may be opened now and what is left over. */
export function limitOpen(urls: readonly string[], max = BULK_OPEN_LIMIT) {
  return { open: urls.slice(0, max), skipped: Math.max(0, urls.length - max) };
}

/** `- [name](url)` lines for pasting into notes, issues or Slack. Titles cannot break the link. */
export function markdownList(items: ReadonlyArray<{ title: string; url: string }>): string {
  return items.map((item) => `- [${item.title.replace(/[[\]]/g, "")}](${item.url})`).join("\n");
}

/** True when a key event came from something the user is typing into. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || Boolean(el.isContentEditable);
}

export type FilterChip = { id: string; label: string };

/** Count of controls that differ from their defaults (for the "Filters (n)" badge). */
export function activeCount(chips: readonly FilterChip[]): number {
  return chips.length;
}

export type Group<T> = { key: string; label: string; rows: T[] };

/**
 * Group rows into ordered sections. Sections sort by `order`, then label;
 * rows keep their incoming order inside each section.
 */
export function groupRows<T>(
  rows: readonly T[],
  describe: (row: T) => { key: string; label: string; order: number },
): Group<T>[] {
  const groups = new Map<string, Group<T> & { order: number }>();
  for (const row of rows) {
    const { key, label, order } = describe(row);
    const existing = groups.get(key);
    if (existing) existing.rows.push(row);
    else groups.set(key, { key, label, order, rows: [row] });
  }
  return [...groups.values()]
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map(({ key, label, rows: members }) => ({ key, label, rows: members }));
}

/** Flatten groups back into one ordered list (used so pagination follows group order). */
export function flattenGroups<T>(groups: readonly Group<T>[]): T[] {
  return groups.flatMap((group) => group.rows);
}
