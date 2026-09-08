# Today-centred Mission Control — implementation plan

Follows your recommended order: trust and correctness → capture and Today → scheduling and recovery → visual polish → optional intelligence. Each phase ships independently and is checked against your acceptance tests.

## What already exists (kept, not rebuilt)

- Tasks already carry `dueDate`, `scheduledAt`, `notBefore`, `committedOn` and `touchedAt`; snoozing never rewrites the deadline.
- A daily work queue, timeline builder, quick-capture parser, Review page (Eisenhower + graveyard), Focus lock, cloud sync with a dirty-record journal, and Google Calendar sync are in place.
- Gaps: no estimated duration, no multiple work blocks, no capacity math, home screen still leads with pills/stats and infrastructure pulses, capture does not show what it parsed, no All/Personal/Work switch, no saved/pending/failed indicator per edit, evening review auto-rolls nothing but also offers no explicit "reduce scope / back to Inbox" choices.

## Phase 1 — Trust and correctness

- Per-record sync state: every task/note shows Saved / Pending sync / Failed (small dot + tooltip, text label on failure). Failed items get a Retry action.
- Recoverable destructive actions: Delete and bulk actions become soft-delete with a 10-second Undo toast; a Trash view under Review restores or purges after 30 days.
- Calendar sync de-duplication: sync keyed by `gcalEventId` + task fingerprint; a completed or moved calendar block updates the block only, never the task's status or due date.
- Export / restore: one-click JSON export of all data and a restore-from-file that previews counts before applying.
- Tests added for: DST-crossing timed tasks, all-day events across time zones, recurrence with `endCount`, duplicate-event prevention.

## Phase 2 — Capture and Today

Task model additions (backward compatible, all optional):
- `estimateMin` — estimated duration.
- `blocks[]` — work blocks `{ id, date, start, end, done }`; `scheduledAt` becomes the first block's date for compatibility.
- `area` — `"personal" | "work"` (default work).
- `inbox` — true when captured with title only.

Capture:
- One required field: title. Enter saves immediately.
- Inline parse chips shown before saving: "Fri 12 Sep — deadline" (tap to switch to "scheduled"), "45 min", "Work". Each chip is editable or removable; the raw text is never silently rewritten.
- Desktop: `N` opens capture anywhere; `⌘/Ctrl+K` already exists. Mobile: capture button stays in the bottom nav, thumb-reachable.
- Inbox list (title-only items) shown on Today with a one-tap "plan it" to add due date or block.

Today home (replaces the current pill/pulse-first layout):
- Top: 1–3 chosen outcomes for today (`committedOn`), each with estimate and status.
- Next action card: single item, one primary button (Start focus / Done), reason line ("due today, 45 min, fits before your 14:00 meeting").
- Capacity bar: available time (working hours minus fixed events) vs. scheduled workload; warning when over: "Selected work exceeds today's available time — choose what to move" with a list to move/unschedule.
- Desktop: two columns — outcomes + task list left, day timeline (meetings from Google Calendar + work blocks) right. Mobile: timeline/agenda first, outcomes as a collapsible header, capture pinned.
- Pills, Site/Validation/Intelligence pulses and Insights move to a "More" section below the fold and to their own pages; nothing above the fold shows totals, streaks or scores.

## Phase 3 — Scheduling and recovery loop

- Work blocks on the timeline: drag to move, resize to change duration, split a large task into several blocks. Moving a block never changes `dueDate`; the deadline shows as a separate flag on the timeline.
- Completing a block marks the block done and asks "Task finished too?" only if it was the last block.
- Morning plan (first open of the day): pick outcomes → confirm they fit → done in under a minute.
- Evening review (after working hours or on demand): for each unfinished committed item choose Reschedule / Reduce scope (edit estimate or split) / Back to Inbox / Delete. Nothing rolls forward automatically; skipped items stay in Inbox.
- Completion message replaces scores: "Your essential commitments are complete" / "2 of 3 done — 1 moved to tomorrow by you".

## Phase 4 — All / Personal / Work and availability

- Global switch in the top bar filters every planning view (Today, Tasks, Calendar, Review). One dataset, no copies.
- Personal items pushed to Google Calendar can be sent as "Busy" (title and notes withheld) via a per-area setting, so a shared calendar shows availability only. Visibility filter and this privacy setting are separate controls with separate labels.
- Shared-task ownership (`owner`) is stored now; multi-user sharing itself is out of scope until accounts for other people exist.

## Phase 5 — Visual system: calm, precise, quietly premium

- Neutral surfaces, one primary action colour; strong colours only for overdue, failed sync and destructive actions, always paired with an icon or label.
- Type scale: task titles dominant (16/600), metadata 12/500 muted; consistent 4/8/12/16 spacing, one border style, one radius.
- Keyboard: J/K move, Enter open, X complete, S schedule, visible focus rings everywhere; `prefers-reduced-motion` disables all non-essential motion.
- Motion only to explain change: complete (fade + collapse), move (slide to new slot), reschedule (fly to date).
- Mobile designed separately: agenda-first, larger touch targets, sheet-based editing, no squeezed desktop grids.
- Grayscale check and keyboard-only walkthrough added to the QA checklist.

## Phase 6 — Optional intelligence (last)

- "Suggest a plan" proposes outcomes and blocks with a reason per item; shown as a preview diff, applied only on confirm, fully undoable.

## Measurement

Local, private counters (no external analytics): capture-to-save time, morning plan duration, evening review completion, number of block moves per day, sync failures. Shown on the Settings page, not on Today.

## Technical notes

- Model changes go in `src/lib/db.ts` with a migration that maps legacy `scheduledAt`/`startTime`/`endTime` into a single block.
- Capacity and next-action logic live in `src/lib/timeline.ts` and `src/lib/workQueue.ts` (pure functions, unit-tested).
- Home is rebuilt in `src/pages/DashboardHome.tsx` with new `TodayOutcomes`, `NextAction`, `CapacityBar`, `InboxStrip` components; pulses/insights relocate.
- Sync state per record comes from the existing dirty journal in `src/lib/cloudSync.ts`, exposed through a hook.
- Soft delete adds `deletedAt` and a Trash view; Google Calendar "Busy" projection is a mapping in `src/lib/googleCalendar.ts`.
