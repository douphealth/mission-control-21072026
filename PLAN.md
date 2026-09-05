# Mission Control → Unified Operating System (v3)

Branch: `agent/unified-system-v3` (off `main` @ 0946a85). Does NOT touch the two
stale remote branches (`agent/unified-mission-control-foundation`, `refactor/mission-control-os-v2`).

## Goal

Mission Control stops being a dashboard you check and becomes a system that
answers three questions every time you open it:

1. **What am I doing now?**
2. **What is next?**
3. **What needs my attention?**

The final goal is not task management — it is the system knowing and surfacing
what has the highest value at every moment.

## Non-negotiables

- Keep everything that already works (work queue, truth states, review loop,
  decay triage, capture modal, Snap/Voice capture, cloud sync, all modules).
- Planning never mutates real deadlines (`notBefore`/`scheduledAt` semantics stay).
- No demo data. Truth states stay honest (`truth.ts`).
- Local-first (Dexie) stays canonical; cloud push unchanged.
- Every phase is measured: tests + typecheck + lint + build before commit.
- Modules are demoted to a second level, never deleted.

## Phases (each = one commit, gated by tests)

### P1 — Priority engine v2 (explainable)

`src/lib/priorityEngine.ts` (new): transparent score made of named dimensions
(deadline pressure, priority weight, decay, kind bias, pinned). Every score
carries its reasons. `workQueue.scoreOf` becomes a thin wrapper delegating to
it so all existing consumers keep working. Focus page starts consuming the same
engine (kills the two-engines problem). Tests: dimension math, ordering
invariants, reason strings.

### P2 — Unified Timeline

`src/lib/timeline.ts` (new): merges agenda rows, commitments, attention items,
and untimed queue items into one chronological "Today" feed with a NOW marker.
Attention keeps its red-card role but renders inside the timeline. Tests: merge
ordering, now-marker placement, overflow behavior.

### P3 — Focus merged into Home

`src/components/dashboard/FocusDock.tsx` (new): the Focus timer becomes an
always-available overlay docked on Home, seeded from the Now card. `FocusPage`
stays as a full-screen route for deep sessions (backward compatible), but
Focus stops being a first-class destination in the sidebar.

### P4 — Universal capture

`src/lib/quickCapture.ts` (new): one text box, one router. `>` task, `@`
reminder, `#` note, `!` idea, `http` link, plus natural-language date/priority
parsing reusing `classifyTranscript`-style heuristics. Wired into the Command
Palette and the Home hero. Tests: routing, date parsing, dedupe guard.

### P5 — Command palette v2

Palette becomes the universal front door: capture commands, queue actions
(complete/plan/focus), plus existing navigation. Fix UTC `toISOString()` bugs
in TopBar + palette NL patterns. Tests: UTC boundary case.

### P6 — Two-level sidebar

Level 1: Home, Timeline, Review, Capture, Calendar. Level 2 (collapsed
"Modules"): everything else, badges intact. MobileBottomNav aligned. Old
section IDs keep working (redirects, not deletes).

### P7 — Gate + critique

Full `bun run check`-equivalent, self-critique doc, push branch, open PR
description with what changed/broke/fixed/learned.
