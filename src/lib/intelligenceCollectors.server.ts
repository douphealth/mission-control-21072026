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
        items.push({ ...item, matchedAnchors: identity.matchedAnchors, verification: identity.verification,
          confidence: identity.confidence, verificationReason: `${identity.reason} Matched in retrieved title/snippet; the full article has not been fact-checked.`,
          corroborationCount: 0, retrievalProvider: 'multi-news' });
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
