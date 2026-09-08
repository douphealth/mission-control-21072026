# Roadmap — Today-centred Mission Control

Plan: .lovable/plan/today-centred-mission-control-implementation-plan-2026-09-08.md

## Phase 1 — Trust
- [x] Per-record sync state (saved / pending / failed) + retry
- [x] Soft delete + Undo toast + Trash view (Review)
- [x] Calendar sync: block edits never change task status/due
- [ ] JSON export / restore with preview (existing backup export kept; preview UI pending)
- [x] Tests: capacity, all-day vs timed fixed events, capture semantics (DST/recurrence covered by existing suites)

## Phase 2 — Capture + Today
- [x] Task model: estimateMin, blocks[], area, inbox, deletedAt (optional fields — no schema migration needed)
- [x] Capture chips (deadline/scheduled toggle, duration, area), `N` hotkey
- [x] Today home: outcomes, next action, capacity bar, inbox strip, timeline right
- [x] Move pills/pulses/insights below fold

## Phase 3 — Scheduling + recovery
- [x] Blocks editor in task editor (move/split/complete/remove), deadline kept separate
- [x] Block completion vs task completion
- [x] Evening review with deliberate choices (Day Close)
- [ ] Morning planning flow (suggestion confirm exists on Today; dedicated flow pending)

## Phase 4 — All / Personal / Work
- [x] Global area switch filtering planning views
- [x] GCal "Busy" projection for personal (Settings → Accessibility → Planning)

## Phase 5 — Visual system
- [x] Reduced motion + focus rings (existing a11y store); neutral hierarchy on Today
- [ ] Full token pass across archive modules

## Phase 6 — Suggest a plan (preview + confirm) — [x] deterministic, confirm before apply
