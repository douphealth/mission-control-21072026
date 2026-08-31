// ─── Site Pulse ──────────────────────────────────────────────────────────────
// One honest line per website. Evidence only: no data is NOT health.

import type { Website, SEOProfile, SEOIssue, SEOSnapshot, SyncHealth } from '@/lib/db';
import { ageLabel } from '@/lib/reliability';

export type SiteStatus = 'attention' | 'healthy' | 'unknown';

export interface SitePulseRow {
  id: string;
  name: string;
  status: SiteStatus;
  headline: string;
  detail: string;
  provenance: string;
  openIssues: number;
}

const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function buildSitePulse(input: {
  websites: Website[];
  seoProfiles?: SEOProfile[];
  seoIssues?: SEOIssue[];
  seoSnapshots?: SEOSnapshot[];
  health?: SyncHealth[];
  limit?: number;
}): SitePulseRow[] {
  const issues = (input.seoIssues ?? []).filter((i) => i.status === 'open' || i.status === 'in-progress');
  const rows: SitePulseRow[] = [];

  for (const site of input.websites) {
    if (site.status === 'archived') continue;
    const profile = (input.seoProfiles ?? []).find((p) => p.websiteId === site.id);
    const siteIssues = issues
      .filter((i) => i.websiteId === site.id)
      .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9));
    const snapshot = (input.seoSnapshots ?? [])
      .filter((s) => s.websiteId === site.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];

    const hasEvidence = !!snapshot || !!profile?.lastSyncedAt || siteIssues.length > 0;

    let status: SiteStatus = 'unknown';
    let headline = 'Status unknown';
    let detail = 'No observation has been recorded for this site yet.';

    if (site.status === 'down') {
      status = 'attention';
      headline = 'Marked down';
      detail = 'The site is flagged as down in your portfolio.';
    } else if (siteIssues.length > 0) {
      status = 'attention';
      headline = siteIssues[0].category.toUpperCase();
      const top = siteIssues.filter((i) => i.severity === 'critical' || i.severity === 'high').length;
      detail =
        top > 0
          ? `${top} unresolved high-priority SEO issue${top === 1 ? '' : 's'}`
          : `${siteIssues.length} open SEO issue${siteIssues.length === 1 ? '' : 's'}`;
    } else if (profile?.syncStatus === 'error') {
      status = 'attention';
      headline = 'Sync failing';
      detail = profile.syncError || 'The search data connection returned an error.';
    } else if (profile?.syncStatus === 'stale') {
      status = 'unknown';
      headline = 'Data stale';
      detail = `Last successful sync ${ageLabel(profile.lastSyncedAt)}`;
    } else if (hasEvidence) {
      status = 'healthy';
      headline = 'Healthy';
      detail = 'No action required.';
    }

    const sourceBits: string[] = [];
    if (snapshot) sourceBits.push(`${snapshot.source.toUpperCase()} · ${snapshot.date}`);
    else if (profile?.lastSyncedAt) sourceBits.push(`Search data · ${ageLabel(profile.lastSyncedAt)}`);
    else sourceBits.push('No verified source');

    rows.push({
      id: site.id,
      name: site.name,
      status,
      headline,
      detail,
      provenance: sourceBits.join(' · '),
      openIssues: siteIssues.length,
    });
  }

  const order: Record<SiteStatus, number> = { attention: 0, unknown: 1, healthy: 2 };
  return rows
    .sort((a, b) => order[a.status] - order[b.status] || b.openIssues - a.openIssues)
    .slice(0, input.limit ?? 4);
}
