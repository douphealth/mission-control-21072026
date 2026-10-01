export const AUDIENCE_HOSTS: Record<string, readonly string[]> = {
  youtube: ['youtube.com'], x: ['x.com', 'twitter.com'], instagram: ['instagram.com'],
  facebook: ['facebook.com', 'fb.com'], linkedin: ['linkedin.com'], threads: ['threads.net', 'threads.com'],
  tiktok: ['tiktok.com'], github: ['github.com'], bluesky: ['bsky.app'],
};
export function audienceProfile(platform: string, input: string) {
  const u = new URL(input);
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, '');
  if (u.protocol !== 'https:' || u.username || u.password || u.port || !AUDIENCE_HOSTS[platform]?.includes(host)) throw new Error('Use an HTTPS profile URL on the selected platform.');
  const parts = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  let handle = '';
  let channelId: string | undefined;
  if (platform === 'youtube') {
    if (parts[0] === 'channel' && /^UC[\w-]{20,}$/.test(parts[1] || '')) channelId = parts[1];
    else if (parts[0]?.startsWith('@')) handle = parts[0].slice(1);
    else throw new Error('Use the YouTube /@handle or /channel/UC... URL, not a video link.');
  } else if (platform === 'linkedin') {
    if (!['in', 'company'].includes(parts[0]) || parts.length !== 2) throw new Error('Use the LinkedIn person or company profile URL.');
    handle = parts[1];
  } else if (platform === 'bluesky') {
    if (parts[0] !== 'profile' || parts.length !== 2) throw new Error('Use a bsky.app/profile/handle profile URL.');
    handle = parts[1];
  } else if (platform === 'facebook' && parts[0] === 'profile.php') {
    handle = u.searchParams.get('id') || '';
  } else {
    if (parts.length !== 1) throw new Error('Use the profile URL, not a post, repository or video URL.');
    handle = parts[0].replace(/^@/, '');
  }
  if ((!handle && !channelId) || /[\s/?#]/.test(handle) || ['home', 'login', 'explore', 'search', 'reel', 'watch', 'i'].includes(handle.toLowerCase())) throw new Error('The URL does not identify a public profile.');
  u.hash = '';
  if (platform !== 'facebook') u.search = '';
  return { handle, channelId, url: u.toString() };
}
export function measuredCount(value: unknown): number | null {
  if (typeof value === 'string' && !/^\d+$/.test(value)) return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}
function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
/** Parse JSON only, never execute page scripts. A nearby unrelated count is not evidence. */
export function profileJsonMetrics(platform: string, handle: string, html: string): { followers: number; posts: number | null } | null {
  const candidates: Array<{ followers: number; posts: number | null }> = [];
  let visited = 0;
  const same = (value: unknown) => typeof value === 'string' && value.replace(/^@/, '').toLowerCase() === handle.toLowerCase();
  const walk = (value: unknown, depth = 0) => {
    if (++visited > 20_000 || depth > 30) return;
    if (Array.isArray(value)) { value.forEach(item => walk(item, depth + 1)); return; }
    const row = object(value); if (!row) return;
    let followers: number | null = null, posts: number | null = null;
    if (platform === 'instagram' && same(row.username)) {
      followers = measuredCount(object(row.edge_followed_by)?.count);
      posts = measuredCount(object(row.edge_owner_to_timeline_media)?.count);
    }
    if (platform === 'x' && same(row.screen_name)) {
      followers = measuredCount(row.followers_count); posts = measuredCount(row.statuses_count);
    }
    if (platform === 'tiktok' && same(object(row.user)?.uniqueId)) {
      const stats = object(row.stats) || object(row.statsV2);
      followers = measuredCount(stats?.followerCount); posts = measuredCount(stats?.videoCount);
    }
    if (followers !== null) candidates.push({ followers, posts });
    Object.values(row).forEach(child => walk(child, depth + 1));
  };
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const body = match[1].trim();
    if (body.length > 2_000_000 || !/^[\[{]/.test(body)) continue;
    try { walk(JSON.parse(body)); } catch { /* Scripts are not JSON; never eval. */ }
  }
  const counts = new Set(candidates.map(item => item.followers));
  return counts.size === 1 ? candidates[0] : null;
}
