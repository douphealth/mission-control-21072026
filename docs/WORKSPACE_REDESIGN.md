# Workspace redesign

Release work completed on 3 November 2026. This update redesigns the shared application shell and the Intelligence and Operate workflows.

## Navigation and presentation

- One catalog defines all 32 built-in workspaces, their purpose, group, icon and search terms. Custom workspaces remain supported.
- Desktop navigation, the mobile workspace directory and command search share this catalog.
- Section links support browser history and direct bookmarks while preserving unrelated authentication fragments.
- Light and dark themes, comfortable and compact density, mobile navigation, visible keyboard focus and reduced-motion preferences are supported.
- Quick Capture opens a working capture form. Shared forms use modal focus containment, associated field labels, Escape dismissal and focus return.
- The status bar reads deployment metadata instead of displaying a hardcoded version.

## Workspace responsibilities

| Workspace | Responsibility |
| --- | --- |
| Trends | Research subject coverage and tracked publisher feeds, retaining sources, publication dates and the query used for each result set. |
| Mentions | Review identity-matched external coverage, with explicit provider coverage, owned-domain exclusion and archive/restore controls. |
| Audience | Track exact public profiles, measurement provenance, freshness and comparable changes. Missing readings remain unavailable. |
| Review | Make task-priority and planning decisions without changing real deadlines. |
| Findings | Record evidence, defer or dismiss observations with context, and create an idempotent linked follow-up task. Task creation does not certify resolution. |
| Captures | Process saved inbox tasks individually or in batches, with conflict-aware Undo that preserves newer edits. |
| Reminders | Create, edit, snooze, complete and reopen reminders. Recurrence preserves its calendar anchor and advances to a future occurrence. |
| Finance | Maintain a recorded ledger with awaited saves, date-derived obligations, separate currency totals and explicit evidence status. |

## Data boundaries

Audience measurements must match the tracked identity. Facebook page likes are not a follower substitute. Rounded, stale and incompatible observations cannot create an exact growth claim. Failed collection preserves prior verified readings while distinguishing them from a current result.

Provider setup is described in [AUDIENCE_INTELLIGENCE.md](AUDIENCE_INTELLIGENCE.md). Configuration status does not establish token permissions or prove a successful measurement. The protected connection-status endpoint returns bounded flags and setup instructions, never secret values.

Finance entries describe recorded evidence. Marking a record paid does not move money or establish a live bank connection. Reminder scheduling does not promise a notification while the application is closed.

Starter catalogs use deterministic identities and atomic database writes to prevent duplicate initialization across tabs or devices. Existing user records remain intact. Identical legacy watch rules are grouped for display and collection while preserving their original source IDs; different identity rules and pause preferences stay separate.

## Validation

The change is checked with automated regression tests, TypeScript, ESLint, the Cloudflare production build, and interactive browser checks. Browser checks include phone and tablet CSS viewports, both themes, workspace search, capture/save/accept/undo, monthly reminder advancement, Finance status and totals, finding-to-task creation, and modal keyboard behavior.

Final local validation on 3 November 2026 passed 602 tests across 77 files, TypeScript, ESLint and a clean Cloudflare build. A final browser check confirmed that 20 legacy watch copies display and scan as 10 distinct rules. The three build manifests match byte for byte, and the temporary responsive QA page is absent from the production output.

The preview uses an isolated local database. It is not evidence of successful authenticated production provider calls. Browser QA records and screenshots are excluded from this repository.

## Second refinement: focused workspaces and reliable operations

The follow-up on 3 November 2026 adds a navy/indigo design system, clearer type hierarchy, larger interaction targets, pinned workspaces, persisted navigation groups, and a scrolling workspace shell. Today renders long task URLs as separately labelled source links while retaining the original saved title. Custom and unavailable pins can be managed without silently evicting another workspace.

Intelligence now leads with the information to review. Trends has Monitor, Research a topic, and Sources views; Mentions has Coverage, Watch rules, and Scan details; Audience has Profiles, Track a profile, and Connections. All three support scoped filtering, explicit empty/error states and CSV exports of the displayed records. Audience adds cards/table views, provider and measurement timestamps, comparable-only deltas, and time-spaced sparklines. Freshness recalculates while open and on returning to the page.

Review is organized into Decide, Prioritise, Close the day, and Archive & trash. Findings adds priority filters, ordering and pagination. Captures applies bulk actions only to selected records still visible in the current view. Finance totals and CSV export use the same period, evidence, type, status, currency and search filters. Money uses currency-specific precision; paid records use paid dates and open obligations use due dates.

### Correctness repairs

- Trends scores use unique topic phrases, capped relevance and publication recency. Existing displayed stories are rescored rather than retaining saturated legacy scores.
- Known article redirect envelopes and tracking parameters are canonicalized. Equivalent source/story copies are grouped without deleting history, and archive/restore acts on every member atomically.
- Collection and capture use stable identities. Captures recognize legacy aliases across active/archive states while keeping distinct mention rules separate.
- GitHub Changelog and Google Search Central RSS discovery use the correct publisher feeds. Publisher refresh no longer silently mixes in broad topic searches.
- Audience uses Cloudflare-supported manual redirects. API credentials are never forwarded through a redirect; public redirects must remain on recognized HTTPS platform hosts.
- Edited watch rules preserve their IDs, custom matching context, pause state and evidence across startup. Collision-safe additions preserve prior rules. Removed starter sources/rules stay removed through independent synced preferences; Undo preserves newer changes.
- Standalone reminders are included in the notification engine. A persisted transactional occurrence claim prevents duplicate alerts. Hidden pages do not consume a claim; foregrounding checks due work. Browser notices reuse existing permission, and closed-app delivery is not promised.
- Today and Reminders share recurrence behavior. Local date boundaries, snooze anchors and calendar-export timestamps have regression coverage.
- Deterministic identity hashing works in HTTP previews with byte-identical SHA-256 output, without changing authentication, encryption or random-ID generation.

### Verification of this refinement

The full local suite passes **645 tests across 82 files**, including regressions for concurrent collection/capture, duplicate and archived aliases, source-removal Undo, edited-rule restart, currency precision, report scope, recurrence, notification visibility and timezone boundaries. TypeScript and the Cloudflare build pass. ESLint has no errors; existing formatting/type warnings remain visible.

Interactive preview checks confirmed source creation, watch-rule creation/editing, reminder editing and weekly advancement, Finance record creation and filter-matched totals. Visual checks covered desktop, a 390px phone view and a 768px tablet view with light/dark themes. Public provider calls in the managed preview returned explicit fetch failures, so that environment does not establish production provider availability. Extensive hot reloads later left IndexedDB operations pending in that preview; clean-session CI/browser verification is required before release. No live personal records were used as test fixtures.

GitHub CI and the existing application-quality workflow are the release gates. Cloudflare Pages builds independently of those checks, so validate the branch before merging. Confirm the canonical site's deployment manifest matches the released commit. Rollback uses a new revert commit or a verified previous Cloudflare deployment; published history must not be rewritten. The pre-change main reference is `af4bd688acbc5c8c797f54b0306d47fcbf005230`.
