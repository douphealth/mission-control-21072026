## Sidebar customization
- [x] Add saved section/category ordering, visibility and custom categories
- [x] Share layout with mobile directory and verify customization after reload — 17 focused tests pass; desktop and phone create/move/hide/show/rename/navigation/reload verified

## Google sync regression and shared usability
- [x] Validate configuration candidates and read native Cloudflare Google bindings
- [x] Replace sync setup dead-end with inline save-and-connect recovery
- [x] Retain related-section navigation on phones and sidebar scrolling
- [x] Test configuration recovery and check Google popup/setup and section navigation — 75 tests passed; setup and simulated consent checked; eleven phone sections render without page errors or document overflow
- [ ] Verify real Google Drive/Tasks/Calendar readback — needs an available OAuth client ID and Google consent

## Dashboard efficiency and quality
- [x] Unify task list/board scope, current-day counts and broader local search
- [x] Restrict bulk task actions to visible selections with pending guards and failure reporting
- [x] Preserve research provenance, exclude invalid/future dates and expose all research results
- [x] Refine shared dashboard hierarchy, controls and phone reading layouts
- [x] Verify task create → list/board → bulk completion → visible reload readback; check 12 sections at phone/tablet/desktop widths and research accuracy tests (42 tests pass)
- [ ] Verify live Trends research and remaining connected section workflows — requires usable provider responses and owner-authorized inventory; not covered by layout checks

## Family bulk actions and mobile menu
- [x] Add encrypted family bulk import with validation and preview, selected-record edits and confirmed deletion
- [x] Redesign mobile directory with favorites, category filters, clearer section rows and current-section state
- [x] Test encrypted bulk operations and verify phone/desktop workflows — 19 tests pass; bulk add/edit/delete and reload verified; favorites verified at 390px and 320px

## Mobile and private vault
- [x] Simplify mobile menu and improve touch controls across sections
- [x] Improve GitHub and Cloudflare phone layouts
- [x] Add passphrase-protected credential management with 1,500-entry import, search, bulk edit/delete and encrypted backups
- [x] Add protected family records for identity and banking details
- [x] Run security/import tests and verify mobile and desktop workflows
- [ ] Verify connected Cloudflare mobile inventory — current preview returns no connected inventory after owner unlock
- [ ] Deploy mobile/vault updates to external Cloudflare site — not deployed in this turn

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
