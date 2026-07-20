# Mission Control v10

## Product goal

Mission Control becomes the single trusted inbox, scheduler, execution queue, and review system for work and personal commitments.

## Non-negotiable principles

1. One canonical task record. Calendar entries, Google Tasks, projects, websites, GitHub work, habits, and recurring routines reference the same task instead of creating disconnected copies.
2. One daily execution queue. The home screen answers: what must I do now, what is blocked, what can be automated, and what is at risk.
3. Local-first and secure by default. The app must never silently connect to a shared backend or publish credentials through permissive database policies.
4. Automation with approval levels. Every automation is classified as suggest-only, approval-required, or safe auto-execute.
5. Observable operations. Every automated action records its trigger, inputs, result, duration, retries, and failure reason.
6. No demo data in production. A new workspace starts empty and offers explicit import or onboarding.

## Canonical domains

- Tasks: outcomes, next actions, priorities, dependencies, recurrence, estimated effort, energy, and deadlines.
- Projects: multi-step outcomes with owner, status, health, next milestone, and linked tasks.
- Areas: ongoing responsibilities such as health, finance, family, websites, and business operations.
- Resources: notes, links, credentials references, repositories, websites, and documents.
- Automations: schedules, triggers, actions, approval level, run history, and health.
- Calendar: time commitments and time blocks linked to canonical tasks.

## Daily operating loop

1. Capture everything into the universal inbox.
2. Clarify each item into task, project, calendar event, note, or automation.
3. Score open tasks by urgency, impact, deadline, project health, effort, and blockage.
4. Build a realistic Today plan using available time and energy.
5. Execute one task at a time with focus mode.
6. Record completion, blockers, and automation results.
7. Run an end-of-day review and prepare tomorrow.

## Release sequence

### Release 1: trustworthy foundation

- Remove bundled fake workspace data.
- Disable implicit Supabase connection.
- Replace permissive public policies with authenticated per-user access.
- Add explicit first-run onboarding and backup import.
- Add a Today command center and deterministic task scoring.

### Release 2: one scheduler

- Introduce canonical schedules and recurrence rules.
- Reconcile Google Calendar and Google Tasks without duplicate records.
- Add conflict detection, missed-run recovery, idempotency keys, and timezone-safe execution.
- Add automation run history and health monitoring.

### Release 3: autonomous operations

- Add connectors for GitHub, WordPress, analytics, email, and infrastructure.
- Add approval policies and reversible action plans.
- Add portfolio routines for website health, SEO, publishing, billing, and maintenance.
- Add personal routines for health, errands, finance, and weekly planning.

## Definition of done

The system is successful when every commitment is captured once, every scheduled action has an observable run record, the Today page produces a realistic ordered plan, and no private data is exposed through shared defaults or anonymous write policies.
