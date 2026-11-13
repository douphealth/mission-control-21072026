<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Private server functions (GitHub/Cloudflare inventory) accept either a Cloudflare Access JWT or the `x-mc-owner-passcode` header matching `MC_OWNER_PASSCODE`; the app is hosted on Lovable, not behind Cloudflare Access, so the passcode is the owner gate.
- `GITHUB_TOKEN` is a single-token fallback used when `GITHUB_PORTFOLIO_TOKENS_JSON` is absent; private repos of an account only load with that account's own token.
- Each device publishes its passphrase-wrapped vault keyring to its own synced settings row (`private-vault-<device>`); unlocking merges every openable keyring and decrypt tries all session keys, so passwords saved on any device open everywhere without overwriting another device's row.
- Private vault access wraps the existing device encryption key with a master passphrase; keep the unwrapped key in tab sessionStorage until the owner presses Lock or closes the tab (owner asked not to re-enter it on every window switch), and preserve legacy ciphertext. Family records use a separate encrypted IndexedDB store so ordinary notes, sync and exports cannot expose them; encrypted vault backup explicitly includes both stores.
- New credential ciphertext derives one cached AES-GCM data key per unlocked session with unique random IVs per value; passphrase wrapping uses a separate PBKDF2 key to avoid repeating expensive derivations for every imported record.
- Family bulk operations validate before transactional writes, preserve private values during shared-field edits and assign fresh import IDs; this prevents partial changes and accidental overwrites. The shared section directory reuses navigation pins for mobile favorites to avoid divergent menus.
- Search (Google Search Console service account + Bing) and social (Metricool + Publer) data load through owner-gated server functions in `src/lib/growthData.functions.ts`, cached 30 min per worker to save API quota; Google uses one property per host, preferring Domain properties because they cover every subdomain.
- Task list, board and print share deterministic view selectors and a live local-day clock; bulk selections are restricted to the current view to prevent hidden-record edits.
- Research article merges preserve the strongest explicit evidence independently of relevance and aggregate provider attribution; unknown evidence must not pass attributed-evidence filters.
- Shared dashboard styling belongs in `src/mc-design-system.css`; refine existing semantic tokens and working surfaces rather than adding another competing theme stylesheet.
- Task reading layouts separate content from actions below laptop width and wrap full titles; preserve dynamic row measurement so longer content remains accessible without changing task records.
- Household planning sends only an explicit description through the owner-gated AI Gateway function; validate suggestions and save only after review into existing personal task/subtask storage.
- Reading controls reuse the existing accessibility store; scale legacy reading surfaces once, and keep section scroll positions separate from account data.
- Google OAuth resolves validated public client IDs through the named runtime bindings and refreshes cached server configuration once per page session; never expose client secrets or tokens as configuration.
- Sidebar personalization uses the existing persisted navigation store and one shared layout resolver for desktop and mobile; hidden sections retain data, and moving a pinned section unpins it so its chosen category controls placement.
- Sidebar layout/pins/hidden/categories sync via the settings row `navigation` (NavigationAccountSync); fresh devices never seed it so they cannot overwrite the account copy.
- Saved data must survive every app update: local database schema changes only add new numbered versions (never edit, drop or rename existing tables/indexes, never delete databases or clear storage outside the owner's explicit "Clear all"), persisted store version bumps must migrate old values, and vault ciphertext formats stay backward-readable.
- Google Calendar mirroring keeps event bodies stable day to day (no changing counters), PUTs known events directly, spaces and caps writes per pass, and honours a shared 10-minute cool-down after a rate limit; this keeps the per-user write quota from being exhausted.
- A vault recovery code wraps a copy of the keyring in the synced `vault-recovery` settings row (stored outside the `private-vault-` prefix); recovery re-wraps the same keys with a new passphrase so no ciphertext changes.
- Cloud sync settles pending local edits per field: the journal records changed field names, an edit not made on top of the latest seen cloud copy only applies those fields, and deletes (tombstones and Trash markers) win over concurrent edits; this stops stale devices from resurrecting deleted tasks or undoing newer edits.
- Provider sections (Cloudflare, GitHub) paint from a device-only last-good snapshot in the separate `mc-view-cache` IndexedDB (never synced/exported), keep its real age so TTLs still refresh in the background, and wipe `private:` keys on owner Lock; this makes reopen instant and saves unauthenticated GitHub quota. When one account/section fails to load, its rows from the last good inventory are carried forward (with the failure still reported) so a provider outage never makes projects vanish.
- Permanent deletes (GitHub repos, Cloudflare Pages/Workers) go only through owner-gated, same-origin server functions in `src/lib/providerDelete.functions.ts` that require the exact typed name; deleted keys are hidden via the device-local `deletedResources` marks (never by removing saved plans), and a mark clears only when provider data fetched 15+ minutes later shows the name again. This keeps irreversible actions deliberate and lists consistent despite provider lag.
