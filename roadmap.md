## Standalone runtime
- [x] Remove Lovable-dependent cloud sync, auth prompts, and status UI
- [x] Remove Lovable runtime integrations from active app paths
- [x] Keep IndexedDB persistence, local snapshots, JSON export, and restore as the defaults
- [x] Replace the build plugin with the standard TanStack Start Vite plugin
- [x] Disable server email because standalone servers cannot access private browser records
- [x] Verify tests, type safety, and browser behavior

## Standalone account sync and deployment
- [x] Restore optional self-hosted account sync without Lovable runtime services
- [x] Preserve direct Google sign-in, Tasks, and Calendar synchronization
- [x] Replace the disconnected Google dead-end with guided save-and-connect setup
- [x] Stop unauthenticated Google requests and hydration warnings
- [x] Repair the repository's Cloudflare Pages deployment configuration
- [ ] Redeploy Cloudflare Pages and verify the target URL
- [ ] Verify local-only and signed-in workflows end to end

## Current
- [x] Connect GitHub + Cloudflare keys
- [ ] Upgrade GitHub & Cloudflare sections (filters, accuracy, management)
- [ ] Audit Trends, Mentions, Audience, Review, Findings, Captures, Reminders, Finance
- [ ] App-wide visual polish
- [x] Trends: GitHub Changelog feed falsely flagged as blocked (fixed)
- [x] Connect Google: friendly message when sign-in ID missing
- [ ] Google sync — waiting on user's Google OAuth Client ID
- [x] Mentions: DataForSEO connected, brand-stem search (results verified)
- [ ] Bring data from old device — user exports backup on old device, imports here
- [ ] Refined-dark visual polish pass, section by section
- [ ] Search Console (service account JSON) → SEO section
- [ ] Bing Webmaster (key saved) → SEO section
- [ ] Metricool (token saved, needs userId/blogId) → Audience section
