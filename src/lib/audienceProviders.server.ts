import { audienceProfile, measuredCount, profileJsonMetrics } from './audienceEvidence';

export type AudienceMethod = 'official-api' | 'public-page' | 'none';
export type AudienceMetricSemantics = 'exact' | 'rounded' | 'approximate' | 'unavailable';

export interface AudienceObservation {
  followers: number | null;
  posts: number | null;
  status: 'ok' | 'unavailable' | 'limited';
  method: AudienceMethod;
  provider: string;
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
  approximate: boolean;
  identityVerified: boolean;
  capturedAt: string;
  sourceUrl: string;
  errorCode?: string;
  action?: string;
  verifiedHandle?: string;
  providerAccountId?: string;
  metricSemantics?: AudienceMetricSemantics;
}

function unavailable(
  url: string,
  evidence: string,
  action: string,
  errorCode = 'unavailable',
  provider = 'No verified provider',
): AudienceObservation {
  return {
    followers: null,
    posts: null,
    status: 'unavailable',
    method: 'none',
    provider,
    confidence: 'low',
    evidence,
    approximate: false,
    identityVerified: false,
    capturedAt: new Date().toISOString(),
    sourceUrl: url,
    errorCode,
    action,
    metricSemantics: 'unavailable',
  };
}

function observed(input: {
  url: string;
  provider: string;
  followers: unknown;
  posts?: unknown;
  evidence: string;
  method?: Exclude<AudienceMethod, 'none'>;
  approximate?: boolean;
  semantics?: Exclude<AudienceMetricSemantics, 'unavailable'>;
  verifiedHandle?: string;
  providerAccountId?: string;
}): AudienceObservation {
  const count = measuredCount(input.followers);
  const posts = measuredCount(input.posts);
  const method = input.method ?? 'official-api';
  const approximate = Boolean(input.approximate);
  return {
    followers: count,
    posts,
    status: count === null ? 'limited' : 'ok',
    method,
    provider: input.provider,
    confidence: method === 'official-api' ? 'high' : 'medium',
    evidence: input.evidence,
    approximate,
    identityVerified: true,
    capturedAt: new Date().toISOString(),
    sourceUrl: input.url,
    action: count === null ? 'This provider did not disclose a follower count.' : undefined,
    verifiedHandle: input.verifiedHandle,
    providerAccountId: input.providerAccountId,
    metricSemantics: count === null ? 'unavailable' : input.semantics ?? (approximate ? 'approximate' : 'exact'),
  };
}

async function get(
  url: string,
  json = true,
  headers: Record<string, string> = {},
): Promise<any> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: json ? 'application/json' : 'text/html',
          'User-Agent': 'MissionControl/3.0 audience-intelligence',
          ...headers,
        },
        signal: controller.signal,
        redirect: 'error',
        cache: 'no-store',
      });

      if (!response.ok) {
        const retryable = [408, 425, 429, 500, 502, 503, 504].includes(response.status);
        const retryAfter = Number(response.headers.get('retry-after') || '');
        lastError = new Error(`Provider HTTP ${response.status}`);
        if (!retryable || attempt === 2) throw lastError;
        const wait = Number.isFinite(retryAfter)
          ? Math.min(4_000, Math.max(300, retryAfter * 1_000))
          : 350 * 2 ** attempt;
        await new Promise(resolve => setTimeout(resolve, wait));
        continue;
      }

      const text = await response.text();
      if (text.length > 4_000_000) throw new Error('Provider response too large');
      if (!json) return text;

      const type = response.headers.get('content-type') || '';
      const first = text.trimStart()[0];
      if (type && !/json/i.test(type) && first !== '[' && first !== '{') {
        throw new Error('Provider returned a non-JSON response');
      }
      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') ||
        /Provider HTTP (408|425|429|500|502|503|504)\b/.test(message);
      if (!retryable || attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 350 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Provider request failed');
}

function cleanHandle(value: unknown): string {
  return typeof value === 'string' ? value.replace(/^@/, '').trim().toLowerCase() : '';
}

function sameHandle(value: unknown, expected: string): boolean {
  return cleanHandle(value) === cleanHandle(expected);
}

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function metaGraphVersion(): string {
  return env('META_GRAPH_VERSION') || 'v26.0';
}

function linkedinVersion(): string {
  return env('LINKEDIN_VERSION') || '202606';
}

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function threadsMetric(payload: any, name: string): number | null {
  const metric = Array.isArray(payload?.data)
    ? payload.data.find((item: any) => item?.name === name)
    : undefined;
  const candidates = [
    metric?.total_value?.value,
    metric?.total_value,
    Array.isArray(metric?.values) ? metric.values.at(-1)?.value : undefined,
    metric?.value,
  ];
  for (const value of candidates) {
    const count = measuredCount(value);
    if (count !== null) return count;
  }
  return null;
}

async function readInstagramOfficial(profile: ReturnType<typeof audienceProfile>): Promise<AudienceObservation | null> {
  const token = env('META_ACCESS_TOKEN');
  const businessId = env('INSTAGRAM_BUSINESS_ACCOUNT_ID');
  if (!token || !businessId) return null;

  const fields = `business_discovery.username(${profile.handle}){username,id,followers_count,media_count}`;
  const params = new URLSearchParams({ fields, access_token: token });
  const result = await get(
    `https://graph.facebook.com/${metaGraphVersion()}/${encodeURIComponent(businessId)}?${params}`,
  );
  const target = result?.business_discovery;
  if (!target || !sameHandle(target.username, profile.handle)) {
    return unavailable(
      profile.url,
      'Instagram Graph API did not return the exact requested professional account identity.',
      'Verify that the target is an Instagram Professional account and that Business Discovery permissions are active.',
      'identity-mismatch',
      'Instagram Graph API',
    );
  }
  return observed({
    url: profile.url,
    provider: 'Instagram Graph API — Business Discovery',
    followers: target.followers_count,
    posts: target.media_count,
    evidence: 'Official Instagram Business Discovery response; exact target username matched.',
    verifiedHandle: target.username,
    providerAccountId: target.id ? String(target.id) : undefined,
  });
}

async function readFacebookOfficial(profile: ReturnType<typeof audienceProfile>): Promise<AudienceObservation | null> {
  const token = env('FACEBOOK_PAGE_ACCESS_TOKEN') || env('META_ACCESS_TOKEN');
  if (!token) return null;

  const fields = 'id,name,username,followers_count,fan_count,link';
  const params = new URLSearchParams({ fields, access_token: token });
  const result = await get(
    `https://graph.facebook.com/${metaGraphVersion()}/${encodeURIComponent(profile.handle)}?${params}`,
  );

  const numericHandle = /^\d+$/.test(profile.handle);
  let linkHandle = '';
  try {
    if (result?.link) linkHandle = new URL(result.link).pathname.split('/').filter(Boolean)[0] || '';
  } catch {
    linkHandle = '';
  }
  const identityVerified =
    (numericHandle && String(result?.id) === profile.handle) ||
    sameHandle(result?.username, profile.handle) ||
    sameHandle(linkHandle, profile.handle);
  if (!identityVerified) {
    return unavailable(
      profile.url,
      'Facebook Graph API returned a Page that could not be tied to the requested Page identity.',
      'Use the Page vanity URL or numeric Page ID and ensure the token has Page Public Content/Metadata access.',
      'identity-mismatch',
      'Facebook Graph API',
    );
  }

  return observed({
    url: profile.url,
    provider: 'Facebook Graph API',
    followers: result.followers_count ?? result.fan_count,
    posts: null,
    evidence: 'Official Facebook Page response; Page identity matched. followers_count is preferred, with fan_count used only when that is the available Page counter.',
    verifiedHandle: result.username || linkHandle || profile.handle,
    providerAccountId: result.id ? String(result.id) : undefined,
  });
}

async function readThreadsOfficial(profile: ReturnType<typeof audienceProfile>): Promise<AudienceObservation | null> {
  const token = env('THREADS_ACCESS_TOKEN');
  if (!token) return null;

  const identity = await get(
    'https://graph.threads.net/me?fields=id,username',
    true,
    bearer(token),
  );
  if (!sameHandle(identity?.username, profile.handle)) {
    return unavailable(
      profile.url,
      'The configured Threads token belongs to a different account.',
      'Configure a Threads token for this exact profile or track the token owner profile.',
      'identity-mismatch',
      'Threads API',
    );
  }

  const insights = await get(
    'https://graph.threads.net/me/threads_insights?metric=followers_count',
    true,
    bearer(token),
  );
  return observed({
    url: profile.url,
    provider: 'Threads API — Account Insights',
    followers: threadsMetric(insights, 'followers_count'),
    posts: null,
    evidence: 'Official Threads account insight; authenticated username matched the requested profile.',
    verifiedHandle: identity.username,
    providerAccountId: identity.id ? String(identity.id) : undefined,
  });
}

async function readTikTokOfficial(profile: ReturnType<typeof audienceProfile>): Promise<AudienceObservation | null> {
  const token = env('TIKTOK_ACCESS_TOKEN');
  if (!token) return null;

  const fields = 'open_id,username,follower_count,video_count';
  const result = await get(
    `https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(fields)}`,
    true,
    bearer(token),
  );
  const user = result?.data?.user;
  if (!user || !sameHandle(user.username, profile.handle)) {
    return unavailable(
      profile.url,
      'The configured TikTok token did not return the exact requested username.',
      'Authorize this TikTok account with user.info.profile and user.info.stats scopes.',
      'identity-mismatch',
      'TikTok Display API',
    );
  }

  return observed({
    url: profile.url,
    provider: 'TikTok Display API',
    followers: user.follower_count,
    posts: user.video_count,
    evidence: 'Official TikTok /v2/user/info response with user.info.stats; exact username matched.',
    verifiedHandle: user.username,
    providerAccountId: user.open_id ? String(user.open_id) : undefined,
  });
}

async function readLinkedInOfficial(
  profile: ReturnType<typeof audienceProfile>,
  originalUrl: string,
): Promise<AudienceObservation | null> {
  const token = env('LINKEDIN_ACCESS_TOKEN');
  if (!token) return null;

  const original = new URL(originalUrl);
  const parts = original.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'company') return null;

  const headers = {
    ...bearer(token),
    'X-Restli-Protocol-Version': '2.0.0',
    'Linkedin-Version': linkedinVersion(),
  };
  const lookupParams = new URLSearchParams({ q: 'vanityName', vanityName: profile.handle });
  const lookup = await get(
    `https://api.linkedin.com/rest/organizations?${lookupParams}`,
    true,
    headers,
  );
  const organizations = Array.isArray(lookup?.elements) ? lookup.elements : [];
  const org = organizations.find((item: any) => sameHandle(item?.vanityName, profile.handle));
  if (!org?.id) {
    return unavailable(
      profile.url,
      'LinkedIn Organization Lookup did not return the exact requested company vanity name.',
      'Use a LinkedIn /company/{vanity-name} URL and an authorized LinkedIn Marketing API token.',
      'identity-mismatch',
      'LinkedIn Organization API',
    );
  }

  const urn = `urn:li:organization:${org.id}`;
  const network = await get(
    `https://api.linkedin.com/rest/networkSizes/${encodeURIComponent(urn)}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`,
    true,
    headers,
  );
  return observed({
    url: profile.url,
    provider: 'LinkedIn Organization Network Size API',
    followers: network?.firstDegreeSize,
    posts: null,
    evidence: 'Official LinkedIn organization network-size response; exact organization vanity name resolved before follower retrieval.',
    verifiedHandle: org.vanityName,
    providerAccountId: String(org.id),
  });
}

export function audienceCapabilities() {
  const youtube = Boolean(env('YOUTUBE_API_KEY'));
  const x = Boolean(env('X_BEARER_TOKEN'));
  const instagram = Boolean(env('META_ACCESS_TOKEN') && env('INSTAGRAM_BUSINESS_ACCOUNT_ID'));
  const facebook = Boolean(env('FACEBOOK_PAGE_ACCESS_TOKEN') || env('META_ACCESS_TOKEN'));
  const threads = Boolean(env('THREADS_ACCESS_TOKEN'));
  const tiktok = Boolean(env('TIKTOK_ACCESS_TOKEN'));
  const linkedin = Boolean(env('LINKEDIN_ACCESS_TOKEN'));

  return {
    youtube,
    x,
    instagram,
    facebook,
    threads,
    tiktok,
    linkedin,
    github: true,
    bluesky: true,
    officialPlatforms: [
      ...(youtube ? ['youtube'] : []),
      ...(x ? ['x'] : []),
      ...(instagram ? ['instagram'] : []),
      ...(facebook ? ['facebook'] : []),
      ...(threads ? ['threads'] : []),
      ...(tiktok ? ['tiktok'] : []),
      ...(linkedin ? ['linkedin'] : []),
      'github',
      'bluesky',
    ],
    configurationRequired: [
      ...(!youtube ? ['YouTube: YOUTUBE_API_KEY'] : []),
      ...(!x ? ['X: X_BEARER_TOKEN'] : []),
      ...(!instagram ? ['Instagram: META_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ACCOUNT_ID'] : []),
      ...(!facebook ? ['Facebook: FACEBOOK_PAGE_ACCESS_TOKEN or META_ACCESS_TOKEN'] : []),
      ...(!threads ? ['Threads: THREADS_ACCESS_TOKEN'] : []),
      ...(!tiktok ? ['TikTok: TIKTOK_ACCESS_TOKEN with user.info.profile + user.info.stats'] : []),
      ...(!linkedin ? ['LinkedIn companies: LINKEDIN_ACCESS_TOKEN'] : []),
    ],
    publicPage:
      'Public-page parsing is only a last-resort fallback. A metric is accepted only when an exact profile identity and the count occur in the same structured profile object; otherwise it stays unavailable.',
  };
}

export async function readAudience(platform: string, url: string): Promise<AudienceObservation> {
  let profile: ReturnType<typeof audienceProfile>;
  try {
    profile = audienceProfile(platform, url);
  } catch (error) {
    return unavailable(
      url,
      error instanceof Error ? error.message : 'Invalid profile URL.',
      'Edit the profile URL before refreshing.',
      'invalid-profile',
    );
  }

  try {
    if (platform === 'youtube') {
      const apiKey = env('YOUTUBE_API_KEY');
      if (!apiKey) {
        return unavailable(
          profile.url,
          'YouTube Data API credentials are not configured on this deployment.',
          'Configure YOUTUBE_API_KEY server-side, then refresh this exact channel.',
          'api-not-configured',
          'YouTube Data API',
        );
      }
      const params = new URLSearchParams({ part: 'statistics,snippet', key: apiKey });
      if (profile.channelId) params.set('id', profile.channelId);
      else params.set('forHandle', profile.handle);
      const result = await get(`https://www.googleapis.com/youtube/v3/channels?${params}`);
      const item = result.items?.[0];
      const returnedHandle = item?.snippet?.customUrl?.replace(/^@/, '');
      if (
        !item ||
        (profile.channelId && item.id !== profile.channelId) ||
        (!profile.channelId && returnedHandle && !sameHandle(returnedHandle, profile.handle))
      ) {
        return unavailable(
          profile.url,
          'YouTube Data API did not return the exact requested channel identity.',
          'Check the channel handle or channel ID.',
          'identity-mismatch',
          'YouTube Data API',
        );
      }
      const s = item.statistics || {};
      return observed({
        url: profile.url,
        provider: 'YouTube Data API',
        followers: s.hiddenSubscriberCount ? null : s.subscriberCount,
        posts: s.videoCount,
        evidence: 'Official YouTube channel statistics. subscriberCount is rounded down to three significant figures by YouTube; videoCount counts public videos.',
        approximate: !s.hiddenSubscriberCount,
        semantics: 'rounded',
        verifiedHandle: returnedHandle || profile.handle,
        providerAccountId: item.id,
      });
    }

    if (platform === 'github') {
      const result = await get(`https://api.github.com/users/${encodeURIComponent(profile.handle)}`);
      if (!sameHandle(result.login, profile.handle)) {
        return unavailable(
          profile.url,
          'GitHub returned a different identity.',
          'Use the current exact GitHub username.',
          'identity-mismatch',
          'GitHub REST API',
        );
      }
      return observed({
        url: profile.url,
        provider: 'GitHub REST API',
        followers: result.followers,
        posts: null,
        evidence: 'Public follower count from the official GitHub user endpoint; exact login matched.',
        verifiedHandle: result.login,
        providerAccountId: result.id ? String(result.id) : undefined,
      });
    }

    if (platform === 'bluesky') {
      const result = await get(
        `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(profile.handle)}`,
      );
      if (!sameHandle(result.handle, profile.handle) && result.did !== profile.handle) {
        return unavailable(
          profile.url,
          'Bluesky returned a different identity.',
          'Verify the handle or DID.',
          'identity-mismatch',
          'Bluesky public AppView API',
        );
      }
      return observed({
        url: profile.url,
        provider: 'Bluesky public AppView API',
        followers: result.followersCount,
        posts: result.postsCount,
        evidence: 'Official public Bluesky AppView profile counters; handle/DID matched.',
        verifiedHandle: result.handle || profile.handle,
        providerAccountId: result.did,
      });
    }

    if (platform === 'x') {
      const token = env('X_BEARER_TOKEN');
      if (token) {
        const result = await get(
          `https://api.x.com/2/users/by/username/${encodeURIComponent(profile.handle)}?user.fields=public_metrics`,
          true,
          bearer(token),
        );
        if (!sameHandle(result.data?.username, profile.handle)) {
          return unavailable(
            profile.url,
            'X API did not return the requested user.',
            'Verify username and API permissions.',
            'identity-mismatch',
            'X API',
          );
        }
        return observed({
          url: profile.url,
          provider: 'X API',
          followers: result.data.public_metrics?.followers_count,
          posts: result.data.public_metrics?.tweet_count,
          evidence: 'Official X user public_metrics; exact username matched.',
          verifiedHandle: result.data.username,
          providerAccountId: result.data.id,
        });
      }
    }

    if (platform === 'instagram') {
      const official = await readInstagramOfficial(profile);
      if (official) return official;
    }

    if (platform === 'facebook') {
      const official = await readFacebookOfficial(profile);
      if (official) return official;
    }

    if (platform === 'threads') {
      const official = await readThreadsOfficial(profile);
      if (official) return official;
    }

    if (platform === 'tiktok') {
      const official = await readTikTokOfficial(profile);
      if (official) return official;
    }

    if (platform === 'linkedin') {
      const official = await readLinkedInOfficial(profile, url);
      if (official) return official;
    }

    // Last-resort public HTML: never promise access to hidden or login-gated metrics.
    const html = await get(profile.url, false) as string;
    const metrics = profileJsonMetrics(platform, profile.handle, html);
    if (metrics) {
      return observed({
        url: profile.url,
        provider: 'Identity-bound public profile JSON',
        followers: metrics.followers,
        posts: metrics.posts,
        evidence: 'Follower count and exact account identity occur in the same structured profile data object.',
        method: 'public-page',
        verifiedHandle: profile.handle,
      });
    }

    const blocked = /<title[^>]*>[^<]*(?:log[ -]?in|sign[ -]?in|access denied|captcha|challenge)/i.test(html);
    const setup =
      platform === 'x'
        ? 'Configure X_BEARER_TOKEN for authoritative X public_metrics.'
        : platform === 'instagram'
          ? 'Configure META_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ACCOUNT_ID for Instagram Business Discovery.'
          : platform === 'facebook'
            ? 'Configure FACEBOOK_PAGE_ACCESS_TOKEN or META_ACCESS_TOKEN with the required Page access.'
            : platform === 'threads'
              ? 'Configure THREADS_ACCESS_TOKEN for the exact tracked Threads account.'
              : platform === 'tiktok'
                ? 'Configure TIKTOK_ACCESS_TOKEN with user.info.profile + user.info.stats for the exact tracked account.'
                : platform === 'linkedin'
                  ? 'Configure LINKEDIN_ACCESS_TOKEN for LinkedIn company follower counts.'
                  : 'Use an official integration when this platform exposes one.';

    return unavailable(
      profile.url,
      blocked
        ? 'The provider returned a login/challenge page, not profile metrics.'
        : 'The returned public page contained no unambiguous identity-bound follower count.',
      setup,
      blocked ? 'provider-blocked' : 'metric-not-exposed',
      'Public profile fallback',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Provider request failed';
    const rateLimited = /429/.test(message);
    return unavailable(
      profile.url,
      message,
      rateLimited
        ? 'The official provider rate-limited this request. Retry later; the previous verified reading is preserved.'
        : 'Check the exact profile URL and server-side provider credentials. The previous verified reading is preserved.',
      rateLimited ? 'rate-limited' : 'provider-error',
      'Official/public provider',
    );
  }
}
