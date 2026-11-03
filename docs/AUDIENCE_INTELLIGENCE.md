# Audience Intelligence — Production Provider Contract

Mission Control must never invent or infer audience counts. A current metric is stored only when the provider response is tied to the exact tracked profile identity.

## Zero-config official sources
- GitHub REST API — public user follower count
- Bluesky public AppView API — followers and posts

## Optional official integrations
Configure these as server-side Cloudflare Pages environment variables/secrets. Never expose them to client code.

- `YOUTUBE_API_KEY` — YouTube Data API channel statistics
- `X_BEARER_TOKEN` — X API v2 user public_metrics
- `META_ACCESS_TOKEN` + `INSTAGRAM_BUSINESS_ACCOUNT_ID` — Instagram Business Discovery
- `FACEBOOK_PAGE_ACCESS_TOKEN` (or `META_ACCESS_TOKEN` with sufficient Page permissions) — Facebook Page counters
- `THREADS_ACCESS_TOKEN` — Threads account identity + followers_count insight
- `TIKTOK_ACCESS_TOKEN` — TikTok Display API with `user.info.profile` + `user.info.stats`
- `LINKEDIN_ACCESS_TOKEN` — LinkedIn Organization Lookup + Network Size API
- `META_GRAPH_VERSION` — optional Graph API version override
- `LINKEDIN_VERSION` — optional LinkedIn REST version override

## Trust rules
1. Official API results require exact account identity matching.
2. Public-page data is accepted only when the requested identity and count occur in the same structured profile object.
3. Login pages, challenge pages, ambiguous JSON and unrelated counts are rejected.
4. Missing metrics remain null/Unavailable. They are never converted to zero.
5. Failed refreshes preserve the last verified reading and label it as not current.
6. Exact, rounded, approximate and unavailable metrics are stored distinctly.
7. Growth deltas are calculated only between compatible exact metrics for the same identity, provider, method and metric kind.
8. YouTube subscriberCount is labeled rounded because the API reports it to three significant figures.
9. Provider 408/425/429/5xx failures use bounded retry/backoff; persistent failures stay unavailable.
10. Facebook followers require `followers_count`; page likes are not a follower-count substitute. Ambiguous legacy readings are retained but excluded pending a new valid measurement.
11. Connection status is an authenticated server check of configured credential names, not a successful provider request. Google sign-in, ChatGPT connections and saved vault records do not automatically provide audience API credentials.

## Platform constraints
Some APIs expose metrics only for accounts the configured credential is authorized to inspect. That is a provider permission constraint, not a reason to scrape or fabricate data.

LinkedIn support is limited to an authorized organization profile. Personal LinkedIn follower measurements are unavailable. Public structured-page fallbacks for X, Instagram and TikTok are conditional on exact identity evidence and are not guaranteed.
