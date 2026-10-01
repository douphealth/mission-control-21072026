export function coverageOutcome(checked: number, failed: number, matches: number): 'not-configured' | 'unavailable' | 'partial' | 'complete' {
  if (!checked) return 'not-configured';
  if (failed >= checked) return matches ? 'partial' : 'unavailable';
  return failed > 0 ? 'partial' : 'complete';
}
export function isOwnedDomainCoverage(term: { type: string; term: string }, item: { sourceUrl?: string; url: string }): boolean {
  if (term.type !== 'domain') return false;
  const domain = term.term.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  return [item.sourceUrl, item.url].some(raw => {
    if (!raw) return false;
    try { const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, ''); return host === domain || host.endsWith(`.${domain}`); }
    catch { return false; }
  });
}
export async function mapLimited<T, R>(items: readonly T[], concurrency: number, run: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(items.length);
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(items.length, Math.max(1, concurrency)) }, async () => {
    while (index < items.length) { const current = index++; output[current] = await run(items[current], current); }
  }));
  return output;
}
export function mentionQuery(term: { term: string; type: string; anchors?: string[] }): string {
  const quote = (value: string) => `"${value.replace(/["\\]/g, ' ').trim()}"`;
  const clean = term.term.trim();
  const identity = term.type === 'handle' ? '@' + clean.replace(/^@/, '') : clean;
  const anchors = (term.anchors || []).map(a => a.trim()).filter(Boolean).slice(0, 5);
  return quote(identity) + (term.type === 'name' && anchors.length ? ` (${anchors.map(quote).join(' OR ')})` : '');
}
