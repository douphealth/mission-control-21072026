import { matchIdentity } from './intelligenceQuality';
import { isOwnedDomainCoverage, mapLimited, mentionQuery } from './intelligenceRunQuality';
import { searchExternalMentions } from './mentionSearch.server';
import { readAudience, audienceCapabilities } from './audienceProviders.server';
import type { RawItem } from './controlCenter.server';
export interface MentionTerm { id: string; term: string; type: 'name' | 'brand' | 'handle' | 'domain'; anchors?: string[]; negatives?: string[] }
export interface MatchedMention extends RawItem {
  matchedAnchors: string[]; verification: 'exact-domain' | 'exact-handle' | 'anchored-name' | 'exact-brand';
  verificationReason: string; confidence: 'high' | 'medium'; corroborationCount: number;
  retrievalProvider: 'multi-news';
}
export async function collectMentionCoverage(terms: MentionTerm[]) {
  const results = await mapLimited(terms, 2, async term => {
    const empty = { termId: term.id, term: term.term, items: [] as MatchedMention[], checked: false, candidates: 0,
      excludedOwned: 0, rejected: 0, partial: false, providers: [] as Array<{ name: string; ok: boolean; count: number; error?: string }>, fetchedAt: new Date().toISOString(), cached: false, error: null as string | null };
    if (term.type === 'name' && !(term.anchors || []).some(a => a.trim())) return { ...empty, error: 'Add an identity anchor before scanning a personal name.' };
    try {
      const coverage = await searchExternalMentions(mentionQuery(term));
      const checked = coverage.providers.some(p => p.ok);
      const failed = coverage.providers.filter(p => !p.ok);
      const items: MatchedMention[] = [];
      let excludedOwned = 0, rejected = 0;
      for (const item of coverage.items) {
        if (isOwnedDomainCoverage(term, item)) { excludedOwned++; continue; }
        const identity = matchIdentity({ ...term, text: `${item.title} ${item.summary || ''}`, sourceUrl: item.sourceUrl });
        if (!identity) { rejected++; continue; }

        // Search-index evidence proves discoverability, not every claim in the source article.
        // Exact domain/handle identities remain high confidence; brand/name matches remain
        // medium until a trusted tracked feed supplies direct publisher evidence.
        const confidence =
          identity.verification === 'exact-domain' || identity.verification === 'exact-handle'
            ? 'high'
            : 'medium';
        const providers = item.retrievalProviders?.length || 1;
        items.push({
          ...item,
          matchedAnchors: identity.matchedAnchors,
          verification: identity.verification,
          confidence,
          verificationReason: [
            identity.reason,
            `Identity matched in retrieved title/snippet from ${providers} retrieval provider${providers === 1 ? '' : 's'}.`,
            'Search-provider agreement confirms discoverability only; it is not independent factual verification of the article.',
          ].join(' '),
          corroborationCount: 0,
          retrievalProvider: 'multi-news',
        });
      }
      return { ...empty, checked, items, candidates: coverage.items.length, excludedOwned, rejected, partial: failed.length > 0,
        providers: coverage.providers, fetchedAt: coverage.fetchedAt, cached: coverage.cached,
        error: failed.length ? failed.map(p => `${p.name}: ${p.error || 'unavailable'}`).join(' · ') : null };
    } catch (error) { return { ...empty, error: error instanceof Error ? error.message : 'Coverage lookup failed.' }; }
  });
  return { results };
}
export async function collectAudienceMetrics(accounts: Array<{ id: string; platform: string; url: string }>) {
  const readings = await mapLimited(accounts, 3, async account => ({ accountId: account.id, ...await readAudience(account.platform, account.url) }));
  return { readings, capabilities: audienceCapabilities() };
}
