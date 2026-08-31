// ─── "For you today" intelligence selection ──────────────────────────────────
// Only surfaces external items that plausibly touch something the user owns.
// No RSS river on Home: three items maximum, each with a stated reason.

import type { StreamItem, Website, Task } from '@/lib/db';

export interface IntelItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary?: string;
  /** Why this matters to the user, in their own assets' terms. */
  relevance: string;
  matched: string[];
}

const TOPICS = [
  'seo', 'search', 'google', 'index', 'schema', 'core web vitals', 'wordpress',
  'cloudflare', 'ai', 'llm', 'automation', 'analytics', 'hosting', 'security',
];

function tokens(text: string): string {
  return text.toLowerCase();
}

export function selectIntelligence(input: {
  stream: StreamItem[];
  websites: Website[];
  tasks?: Task[];
  limit?: number;
}): IntelItem[] {
  const siteNames = input.websites
    .filter((w) => w.status !== 'archived')
    .map((w) => ({ name: w.name, host: (w.url || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '') }));

  const out: IntelItem[] = [];

  for (const item of input.stream) {
    if (item.status !== 'active' || item.read) continue;
    const hay = tokens(`${item.title} ${item.summary ?? ''} ${item.aiSummary ?? ''}`);
    const matched: string[] = [];

    for (const s of siteNames) {
      if (s.name && hay.includes(s.name.toLowerCase())) matched.push(s.name);
      else if (s.host && hay.includes(s.host.toLowerCase())) matched.push(s.name || s.host);
    }
    const topic = TOPICS.find((t) => hay.includes(t));
    if (matched.length === 0 && !topic && item.kind !== 'mention') continue;

    const relevance =
      matched.length > 0
        ? `Mentions ${matched.slice(0, 2).join(', ')} in your portfolio`
        : item.kind === 'mention'
          ? 'Matches one of your monitored brand terms'
          : `Touches ${topic} — relevant to how your sites are run`;

    out.push({
      id: item.id,
      title: item.title,
      url: item.url,
      source: item.source,
      publishedAt: item.publishedAt,
      summary: item.aiSummary || item.summary,
      relevance,
      matched,
    });
  }

  return out
    .sort((a, b) => (b.matched.length - a.matched.length) || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, input.limit ?? 3);
}
