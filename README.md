# Mission Control

Personal operations dashboard: tasks, calendar, notes, focus and habits — with a
review loop that keeps the backlog from rotting.

## Focused daily path

The daily path is intentionally six screens:

| Screen | Purpose |
| --- | --- |
| Dashboard | Today at a glance |
| Tasks | Capture and work |
| Review | Weekly review, decay triage, priority matrix, daily shutdown |
| Calendar | Time-blocked commitments |
| Notes | Reference material |
| Focus | One locked task at a time |
| Habits | Streaks |

Everything else (Websites, WP Management, Kanban, Payments, Ideas, Credentials,
Links, GitHub, Builds, SEO, Cloudflare, Vercel, OpenClaw) lives behind the
collapsed **Archive** group in the sidebar. Those modules are fully usable and
can be edited, improved or extended at any time — they are simply kept out of
the default daily path to reduce noise.

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
