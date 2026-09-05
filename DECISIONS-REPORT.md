# Unified System v3 — What Changed, What Broke, What Got Fixed, What Was Learned

Branch `agent/unified-system-v3` — 7 commits over main. All phases tested.

## The report, per phase

### P1 — Priority engine (priorityEngine.ts)

**Changed:** Black-box `scoreOf` (magic constants 3.2 / 0.6 / +12) replaced by
`scoreItem` returning score + named dimensions with documented weights.
`WorkItem.scoreDimensions` now ships to every consumer. `FocusPage` ranks by the
same engine — before, it ranked by Eisenhower quadrant and could disagree with
Home's queue.
**Broke (and fixed):** PINNED_BONUS was +100 while the max engine score is ~222 —
a maximally-overdue critical decision outranked your own pinned commitment.
This bug existed in the OLD code too. Fixed (bonus 500) with a test-asserted
invariant `PINNED_BONUS > MAX_ENGINE_SCORE`.
**Learned:** Reason ordering must be semantic (deadline first), not
points-desc — "critical priority" led over "due today" until ranked explicitly.

### P2 — Unified timeline (timeline.ts + TodayTimeline.tsx)

**Changed:** Three panels (TodayCommitments, AttentionFeed, DailyAgenda) → one
chronology: flags → timed (clock) → NOW marker → engine-ordered queue. Reasons
come from the engine's own dimensions, so the explanation cannot drift from
the score.
**Broke (and fixed):** First `nowIndex` design placed the marker by wall-clock
position inside the timed block — produced an undefined-entry crash in tests
and mixed semantics. Redesign: the marker always separates "the day so far"
(clock) from "what the engine says is next" (score). My own test had an
off-by-one asserting `nowIndex+1`; the lib was right, the test was wrong.
**Learned:** The repo's own truth-gate test enforced the OLD structure —
updating structural tests is part of the change, and I strengthened it (now
also asserts the pure builder + local clock).

### P3 — Focus merged into Home (FocusDock.tsx)

**Changed:** "Focus 25m" on the hero docks a 25m session under the hero
(ring, pause/reset, complete-with-touchedAt) instead of navigating away.
FocusPage (full Pomodoro) kept as a route under Modules for deep sessions.
**Nothing broke.** Self-critique: dock sessions are not persisted across
navigation yet (state resets if you leave Home) — acceptable v1, noted as debt.

### P4 — Universal capture (quickCapture.ts + QuickCaptureBar.tsx)

**Changed:** One input + one pure router: prefixes (> task, # note, ! idea,
@ reminder), bare URL → link, question → idea, default → task; priority words,
relative dates (today/tomorrow/in N/next week/weekday), HH:MM normalization,
inline #tags. `toRecord` emits insertable payloads. Live preview chip shows
where text lands before Enter. 13 router tests, all first-run green.
**Broke (and fixed):** LSP caught a dead double-`replace` line during write.
**Learned:** `#`-prefix vs inline-`#tag` ambiguity — resolved by treating a
leading `#` as the note prefix and only stripping inline tags after that.

### P5 — Command palette v2 + UTC bugs

**Changed:** Free text in the palette now offers "Capture: …" as the TOP
action, routed by the same engine — palette is the universal front door for
navigation AND capture.
**Fixed (real bug):** TopBar + palette NL patterns computed "today" via
`toISOString()` (UTC) — every evening in UTC+3 the overdue/due-today counts
lied by a day. Now local `todayISO()`, with a regression-guard test class.
**Broke (and fixed):** My first guard regex matched backup _filenames_ using
toISOString (harmless labels) — test failed, and I had committed before
noticing. Fixed the guard to target only the `const today =` bug pattern.
Learned: run the gate BEFORE `git commit`, not after.

### P6 — Two-level sidebar

**Changed:** Level 1: NOW (Home, Tasks, Review, Calendar, Captures) + CORE
(Findings, Reminders, Notes). Level 2: 20 modules under a collapsed Modules
group — kept, badges intact, never deleted. Auto-expands when the active
section lives inside it so deep links never strand the user.
**Nothing broke.** Old section IDs all still route (sectionMap untouched).

## Numbers

- Tests: 33 (baseline) → 65, all green. +32 new, 0 deleted.
- typecheck: 0 errors. build: clean. lint: repo-wide pre-existing debt only
  (CI already runs it non-blocking).
- Files added: 6 new source + 4 new test files. Files removed: 0.
- Panels removed from Home: 3 siloed → 1 unified (components kept on disk for
  FocusPage/others that may import them; only Home's imports changed).

## Known debt (honest)

1. FocusDock state is not persisted across navigation (v1 acceptable).
2. `TodayCommitments/AttentionFeed/DailyAgenda` files still exist for any
   other importers — dead on Home; decide keep/delete after a usage sweep.
3. QuickCapture `toRecord` payloads for notes/ideas don't set every optional
   field the full editors do (they use safe defaults).
4. The two stale remote branches (`agent/unified-mission-control-foundation`,
   `refactor/mission-control-os-v2`) conflict heavily with current main —
   they should be reviewed/merged or deleted by the owner; I did not touch them.

## What the system does now

Open Mission Control → Home answers, in one viewport: what needs attention
(flags), what you're doing now (hero + dockable focus), what's next (one
timeline with NOW marker). Capture anything from Home or ⌘K. Everything else
stays one click deeper. That is the "system that knows what matters" you asked
for — every ranking decision explainable, every phase measured.
