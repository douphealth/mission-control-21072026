import { audienceProfile, measuredCount, profileJsonMetrics } from './audienceEvidence';

export interface AudienceObservation {
  followers: number | null; posts: number | null; status: 'ok' | 'unavailable' | 'limited';
  method: 'official-api' | 'public-page'; provider: string; confidence: 'high' | 'medium' | 'low';
  evidence: string; approximate: boolean; identityVerified: boolean; capturedAt: string;
  sourceUrl: string; errorCode?: string; action?: string;
}
function unavailable(url: string, evidence: string, action: string, errorCode = 'unavailable'): AudienceObservation {
  return { followers: null, posts: null, status: 'unavailable', method: 'public-page',
    provider: 'Public profile', confidence: 'low', evidence, approximate: false, identityVerified: false,
    capturedAt: new Date().toISOString(), sourceUrl: url, errorCode, action };
}
function observed(url: string, provider: string, followers: unknown, posts: unknown, evidence: string, approximate = false): AudienceObservation {
  const count = measuredCount(followers);
  return { followers: count, posts: measuredCount(posts), status: count === null ? 'limited' : 'ok',
    method: 'official-api', provider, confidence: 'high', evidence, approximate, identityVerified: true,
    capturedAt: new Date().toISOString(), sourceUrl: url, action: count === null ? 'This platform did not disclose the follower count.' : undefined };
}
async function get(url: string, json = true, headers: Record<string, string> = {}): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, { headers: { Accept: json ? 'application/json' : 'text/html',
      'User-Agent': 'MissionControl/2.0 public-profile-monitor', ...headers }, signal: controller.signal, redirect: 'error' });
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > 4_000_000) throw new Error('Provider response too large');
    return json ? JSON.parse(text) : text;
  } finally { clearTimeout(timer); }
}
export function audienceCapabilities() {
  return { youtube: Boolean(process.env.YOUTUBE_API_KEY), x: Boolean(process.env.X_BEARER_TOKEN),
    github: true, bluesky: true, publicPage: 'Only counts bound to the requested profile object are accepted.' };
}
export async function readAudience(platform: string, url: string): Promise<AudienceObservation> {
  let profile: ReturnType<typeof audienceProfile>;
  try { profile = audienceProfile(platform, url); }
  catch (error) { return unavailable(url, error instanceof Error ? error.message : 'Invalid profile URL.', 'Edit the profile URL before refreshing.', 'invalid-profile'); }
  const same = (value: unknown) => typeof value === 'string' && value.replace(/^@/, '').toLowerCase() === profile.handle.toLowerCase();
  try {
    if (platform === 'youtube') {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) return unavailable(profile.url, 'YouTube API credentials are not configured on this deployment.', 'Configure YOUTUBE_API_KEY server-side, then refresh this exact channel.', 'api-not-configured');
      const params = new URLSearchParams({ part: 'statistics,snippet', key: apiKey });
      if (profile.channelId) params.set('id', profile.channelId); else params.set('forHandle', profile.handle);
      const result = await get(`https://www.googleapis.com/youtube/v3/channels?${params}`);
      const item = result.items?.[0];
      if (!item || (profile.channelId && item.id !== profile.channelId)) return unavailable(profile.url, 'No matching channel was returned by the official API.', 'Check the channel handle or channel ID.', 'not-found');
      const s = item.statistics || {};
      return observed(profile.url, 'YouTube Data API', s.hiddenSubscriberCount ? null : s.subscriberCount, s.videoCount,
        'Official channel statistics. YouTube rounds subscriber counts to three significant figures; videoCount counts public videos.', true);
    }
    if (platform === 'github') {
      const result = await get(`https://api.github.com/users/${encodeURIComponent(profile.handle)}`);
      if (!same(result.login)) return unavailable(profile.url, 'GitHub returned a different identity.', 'Use the current exact GitHub username.', 'identity-mismatch');
      // Repository counts are deliberately NOT presented as post counts.
      return observed(profile.url, 'GitHub REST API', result.followers, null, 'Public follower count from the official GitHub user endpoint; exact login matched.');
    }
    if (platform === 'bluesky') {
      const result = await get(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(profile.handle)}`);
      if (!same(result.handle) && result.did !== profile.handle) return unavailable(profile.url, 'Bluesky returned a different identity.', 'Verify the handle or DID.', 'identity-mismatch');
      return observed(profile.url, 'Bluesky public API', result.followersCount, result.postsCount, 'Public profile counters from the official Bluesky AppView; handle/DID matched.');
    }
    if (platform === 'x' && process.env.X_BEARER_TOKEN) {
      const result = await get(`https://api.x.com/2/users/by/username/${encodeURIComponent(profile.handle)}?user.fields=public_metrics`, true,
        { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` });
      if (!same(result.data?.username)) return unavailable(profile.url, 'X did not return the requested user.', 'Verify username and API permissions.', 'identity-mismatch');
      return observed(profile.url, 'X API', result.data.public_metrics?.followers_count, result.data.public_metrics?.tweet_count, 'Official user public_metrics; exact username matched.');
    }
    // Public HTML is a limited fallback, not a promise of access to hidden metrics.
    const html = await get(profile.url, false) as string;
    const metrics = profileJsonMetrics(platform, profile.handle, html);
    if (metrics) return { ...observed(profile.url, 'Identity-bound profile JSON', metrics.followers, metrics.posts,
      'Follower count and exact account identity occur in the same profile data object.'), method: 'public-page', confidence: 'medium' };
    const blocked = /<title[^>]*>[^<]*(?:log[ -]?in|sign[ -]?in|access denied|captcha|challenge)/i.test(html);
    return unavailable(profile.url, blocked ? 'The provider returned a login or challenge page, not profile metrics.' : 'The returned page contained no unambiguous identity-bound follower count.',
      platform === 'x' ? 'Configure an authorized X_BEARER_TOKEN server-side or open the profile directly.' : 'Open the source profile. Restricted metrics need a supported authorized platform integration.', blocked ? 'provider-blocked' : 'metric-not-exposed');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Provider request failed';
    return unavailable(profile.url, message, /429/.test(message) ? 'The provider rate-limited the request. Retry later; the previous valid reading is preserved.' : 'Check the exact profile URL and provider credentials/availability. The previous valid reading is preserved.', /429/.test(message) ? 'rate-limited' : 'provider-error');
  }
}
