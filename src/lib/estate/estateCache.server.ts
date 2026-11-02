/**
 * Per-isolate snapshot cache for the estate. Collection is expensive (dozens of
 * GitHub GraphQL pages and Cloudflare list calls), so a warm isolate answers
 * from memory for FRESH_MS and concurrent callers share one in-flight
 * collection. The browser keeps its own persisted copy for instant paint, so
 * this cache never needs to be shared across isolates.
 */
export const FRESH_MS = 90_000;

type Entry<T> = { value: T; at: number };

export class SnapshotCache<T> {
  private entry: Entry<T> | null = null;
  private inflight: Promise<T> | null = null;

  constructor(
    private readonly freshMs = FRESH_MS,
    private readonly now: () => number = Date.now,
  ) {}

  /** Returns [value, servedFromCache]. `force` bypasses the fresh window but still joins an in-flight run. */
  async get(load: () => Promise<T>, force = false): Promise<[T, boolean]> {
    if (!force && this.entry && this.now() - this.entry.at < this.freshMs)
      return [this.entry.value, true];
    if (this.inflight) return [await this.inflight, false];
    const run = load()
      .then((value) => {
        this.entry = { value, at: this.now() };
        return value;
      })
      .finally(() => {
        this.inflight = null;
      });
    this.inflight = run;
    return [await run, false];
  }

  clear(): void {
    this.entry = null;
  }
}
