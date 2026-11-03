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
