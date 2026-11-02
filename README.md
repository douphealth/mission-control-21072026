# Mission Control

Personal operations system: it tells you what you're doing now, what comes
next, and what needs your attention — one timeline, one capture bar, one
command palette. Everything else is one click deeper.

## The daily loop

| Surface                         | Purpose                                                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home                            | Now → capture → one unified timeline (flags, timed, NOW marker, engine-ordered queue)                                                                 |
| Review                          | Weekly review, decay triage, priority matrix, daily shutdown                                                                                          |
| Calendar                        | Time-blocked commitments                                                                                                                              |
| Tasks                           | Capture and work                                                                                                                                      |
| Captures / Findings / Reminders | The inbox layer                                                                                                                                       |
| Modules (collapsed)             | Websites, WP, SEO, GitHub, Builds, Cloudflare, Vercel, Finance, Habits, Ideas, Credentials, Links, Focus Timer, Settings — everything, one level down |

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

## GitHub and Cloudflare sections

Both sections read live data on the server at request time. Tokens stay on the
server: they are never sent to the browser, logged or cached in a response.
Every estate call requires a verified Cloudflare Access identity
(`CLOUDFLARE_ACCESS_TEAM_DOMAIN` and `CLOUDFLARE_ACCESS_AUD`); without it the
sections show a locked state instead of data.

Set these as Worker secrets (`wrangler secret put NAME`):

| Secret | Format | Used for |
| --- | --- | --- |
| `GITHUB_PORTFOLIO_TOKENS_JSON` | `{"douphealth":"…","Papalexios":"…","papalexios01":"…","papalexios001-wq":"…"}` | Repository inventory for each account. Fine-grained tokens need read access to Metadata, Contents, Pull requests, Issues and Actions. A token whose owner does not match its key is rejected. Missing accounts show as "not connected". |
| `CLOUDFLARE_ACCOUNT_IDS` | `id1,id2` (32-hex account IDs) | Which Cloudflare accounts to read. |
| `CLOUDFLARE_ACCOUNT_TOKENS_JSON` | `{"<accountId>":"token"}` or `{"<accountId>":{"default":"…","pages":"…"}}` | One token per account. Read: Account Settings, Pages, Workers Scripts, Zone, DNS. Actions also need **Pages Edit** (retry and rollback) and **Cache Purge** (purge everything). A read-only token keeps actions disabled with a clear error. |
| `CLOUDFLARE_ACCOUNT_LABELS_JSON` | `{"<accountId>":"Main"}` | Optional display names. |
| `CLOUDFLARE_API_TOKEN` | token | Optional fallback for accounts without their own token. |

Retry, rollback and purge only run after you type the exact project or zone
name, and the server checks that name again before calling Cloudflare.

Local development only: `MC_DEV_ALLOW_UNAUTHENTICATED=1 bun run dev` skips the
Access check so the sections can be exercised on localhost. The flag has no
effect in production builds.

Keyboard: `⌘K` searches repos, Pages, Workers and zones; `/` focuses the
section search; `Shift R` refreshes; `g g` opens GitHub and `g c` Cloudflare.

## Development

```sh
bun install
bun run dev
```

## Built with

TanStack Start · React · TypeScript · Tailwind CSS · Dexie · Zustand
