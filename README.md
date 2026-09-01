# Mission Control

Personal operations system: it tells you what you're doing now, what comes
next, and what needs your attention — one timeline, one capture bar, one
command palette. Everything else is one click deeper.

## The daily loop

| Surface | Purpose |
| --- | --- |
| Home | Now → capture → one unified timeline (flags, timed, NOW marker, engine-ordered queue) |
| Review | Weekly review, decay triage, priority matrix, daily shutdown |
| Calendar | Time-blocked commitments |
| Tasks | Capture and work |
| Captures / Findings / Reminders | The inbox layer |
| Modules (collapsed) | Websites, WP, SEO, GitHub, Builds, Cloudflare, Vercel, Finance, Habits, Ideas, Credentials, Links, Focus Timer, Settings — everything, one level down |

Every ranking is explainable: the priority engine scores named dimensions
(deadline pressure, priority, decay, kind, pinned) and the UI shows those
reasons — never a raw score. Planning (`notBefore`/`scheduledAt`) never
rewrites a real deadline. Universal capture routes free text (`>` task,
`#` note, `!` idea, `@` reminder, bare link) with dates, times, and tags
parsed inline — from Home or ⌘K.

All specialized modules live behind the collapsed **Modules** group in the
sidebar (second level). Those modules are fully usable and can be edited,
improved or extended at any time — they are simply kept out of the default
daily path to reduce noise.

## The review loop

- **Graveyard** — anything 30+ days overdue is not happening as written. Archive
  it in one click (archive ≠ delete; restore any time).
- **Decide** — anything untouched for 14+ days needs a decision, not another day.
- **Priority matrix** — open tasks split into Do / Schedule / Delegate / Drop.
- **Daily shutdown** — pick the three things that matter tomorrow, close the day.

Tasks record `touchedAt` on every update, so staleness is measured by attention,
not by creation date.

## Data

- Local-first: IndexedDB (Dexie) is the working store.
- Cloud backup: every mutation is pushed to the account-scoped `mc_records`
  table, so clearing the browser or switching devices loses nothing.
- Secrets: never commit `.env`. Credentials stored in the vault are encrypted
  (AES-256-GCM) before they leave the device.

## Development

```sh
bun install
bun run dev
```

## Built with

TanStack Start · React · TypeScript · Tailwind CSS · Dexie · Zustand
