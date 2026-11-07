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
- Private vault access wraps the existing device encryption key with a master passphrase; keep the unwrapped key in memory only, preserve legacy ciphertext, and lock on inactivity/tab hiding. Family records use a separate encrypted IndexedDB store so ordinary notes, sync and exports cannot expose them; encrypted vault backup explicitly includes both stores.
- New credential ciphertext derives one cached AES-GCM data key per unlocked session with unique random IVs per value; passphrase wrapping uses a separate PBKDF2 key to avoid repeating expensive derivations for every imported record.
- Search (Google Search Console service account + Bing) and social (Metricool + Publer) data load through owner-gated server functions in `src/lib/growthData.functions.ts`, cached 30 min per worker to save API quota; Google uses one property per host, preferring Domain properties because they cover every subdomain.
