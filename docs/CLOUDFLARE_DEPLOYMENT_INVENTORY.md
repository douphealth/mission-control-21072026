# Mission Control — Cloudflare Pages & Workers integration

## Reality and safety gates

The **Cloudflare / Pages & Workers command center** is powered by the Cloudflare API, not a hard-coded deployment list. Viewing, filtering, opening the Cloudflare management console and browsing deployment history never change anything. The only write actions (deploy latest / retry / roll back a Pages deployment) are **off by default** and require a dedicated per-account `deploy` token — see "Opt-in Pages deploy actions" below.

**GitHub-linked public repository inventory is dated; it does not prove deployment.** The server-side collector identifies Pages source repositories only when reported by Cloudflare. A Worker can be matched by name for navigation, but such a name match is explicitly labelled unverified.

Never deploy this feature with cloudflare.com login URLs as a substitute for application access control. The dashboard is for an authenticated team. Cloudflare Access must protect **both** the site **and its API/server-function endpoints**.

## Server environment (secrets, not build-time/public variables)

- \`CLOUDFLARE_ACCESS_TEAM_DOMAIN\` = \`<team>.cloudflareaccess.com\`
- \`CLOUDFLARE_ACCESS_AUD\` = the Application Audience (AUD) tag from Cloudflare Zero Trust / Access / Applications
- \`CLOUDFLARE_ACCESS_ALLOWED_EMAILS\` (optional) = comma-separated email allowlist, after the valid Access application token has been verified
- \`CLOUDFLARE_ACCOUNT_IDS\` = comma-separated 32-character Cloudflare account IDs
- \`CLOUDFLARE_API_TOKEN\` = read-only token authorized for all configured accounts, **or**
- \`CLOUDFLARE_ACCOUNT_TOKENS_JSON\` = server secret JSON mapping account IDs to their read-only tokens

Cloudflare token permissions required: **Pages Read**, **Workers Scripts Read** or equivalent metadata-read, **Zone Read**, and **Workers Routes Read**. Worker domains and deployment listings also require the applicable Workers read permissions. For Cloudflare's Zone list pagination, \`per_page=50\` is used; Pages projects, Worker domains and deployment history are paginated.

Never commit tokens, account-token JSON, Cloudflare Access JWTs, response dumps containing credentials, or any private repository names to the public repository. Set secrets in the active runtime's secrets manager, independently for staging and production. A token stored in the app's browser-side Credentials Vault is **not** server configuration.

## Operational controls

1. Create a Cloudflare Access self-hosted application protecting Mission Control, with explicit identity and group policies. Record the AUD and team domain as server secrets. Ensure no alternate \`pages.dev\` or preview URL bypasses Access to reach the same APIs.
2. Grant read-only Cloudflare API access for each desired account. Add all account IDs. Use per-account tokens where possible.
3. Configure the secrets on the **actual deployed runtime**. Run the server-side deployment rather than publishing a static-only build with nonfunctional API functions.
4. Open Cloudflare in Mission Control while signed in through Access. Confirm the source badge is LIVE, and validate account, project, worker and domain counts against the official Cloudflare dashboard. Empty or partially failed sync is not success.
5. Compare a known Pages production deployment SHA and a Worker deployment ID with Cloudflare. Open History and verify active/latest records. Check 0, 1 and >100 resources, custom domains and route mappings.
6. Before allowing a team-wide rollout, verify email/group authorization, unauthorized requests failing closed (including API endpoints), no cache leakage, cross-device login, Chrome/Firefox/Safari and mobile layouts, then complete a rollback drill.

## Current implementation limitations

- **Limited, opt-in mutations only**: Pages deploy-latest / retry / rollback are available only with a per-account `deploy` token (below). Domain/DNS edits, traffic shifting, Worker deploys and deleting remain delegated to authenticated Cloudflare management links.
- **No live Cloudflare account data** are baked into the GitHub source. Until secrets are configured and a Cloudflare API call succeeds, the dashboard must be labelled not connected or error.
- **No claimed uptime**: "success" or "serving" reflects Cloudflare deployment metadata, not a successful independent HTTP probe. Managed routes require Zone Read + Workers Routes Read.
- **GitHub private repositories** have been removed from the browser-shipped static catalogs. To show them in an enterprise workspace, use an additional authenticated, server-side GitHub inventory service with least-privilege credentials and per-user RBAC. Do not reintroduce private names into static JavaScript.

## Rollback

Rollback is source-controlled: restore the previous known-good commit in a new PR or revert the approved merge commit; never force-push main. Restore a known-good Cloudflare deployment only after confirming origin, commit, DNS mapping and production health. Do not revoke tokens until any service depending on them has been migrated.

## Multi-account configuration (October 2026)

For each actual Cloudflare account, obtain the **32-character account ID** in its Cloudflare dashboard. An email login is not an account ID and one email may have access to multiple accounts. Do not assume that `papalexios@gmail.com` and `papalexios001@gmail.com` each map to exactly one Cloudflare account.

Set the following **server runtime secrets**, not client-visible variables:

- `CLOUDFLARE_ACCOUNT_IDS`: comma-separated IDs for every account to monitor.
- `CLOUDFLARE_ACCOUNT_TOKENS_JSON`: a JSON object keyed by each account ID with a **read-scoped** Cloudflare API token per account. The old `CLOUDFLARE_API_TOKEN` is supported as fallback, but should not silently be treated as access to every account.
- `CLOUDFLARE_ACCOUNT_LABELS_JSON`: optional JSON object keyed by account ID to a display label (e.g. `"Personal Cloudflare A"` and `"Personal Cloudflare B"`). Account display names are labels; labels do **not** prove identity.
- `CLOUDFLARE_ACCESS_TEAM_DOMAIN`, `CLOUDFLARE_ACCESS_AUD`: required Cloudflare Access verification. Set explicit Access identity/team policies and protect all production and preview app/API entry points.

The main Cloudflare dashboard now gathers Pages, Workers, routes, custom domains and zones from the same multi-account collector, with per-account partial/unavailable status. DNS zone links use the owning account and zone name. Worker domain data uses Cloudflare's documented `enabled` property: only explicitly enabled custom domains are presented as active links. Use an authenticated worker response and compare against the actual Cloudflare dashboard to prove inventory coverage.

**Operational limitations:** Mission Control provides inventory, deployment history and Cloudflare management-console links. It cannot delete resources or change DNS. Pages deploy/retry/rollback exist only behind the opt-in `deploy` token described below. No changes are performed to the live Cloudflare accounts simply by merging a PR.

**Release gate:** verify the Cloudflare Pages server runtime (not a static-only asset upload) executes authenticated server functions and receives the configuration. Check 401/403 denial for unauthorized calls, reconcile all two-account resource counts, and test links before production promotion. Do not expose account tokens in source control, logs or the browser.

## Complete Pages inventory (November 2026)

The Pages list is paginated exhaustively (`listAllPagesProjects` in `src/lib/cloudflareInventory.server.ts`), like wrangler: it keeps requesting pages until Cloudflare returns a short or empty page. `result_info` is only a prefetch hint and a lower-bound check. It de-duplicates by name and fails closed (explicit warning, never a silent partial count) if Cloudflare repeats a page or returns fewer projects than it reports. Each account card shows the proof, e.g. "All 100 Pages projects listed (13 API pages)".

**Why Cloudflare's dashboard shows more than the Pages count.** The dashboard's "Workers & Pages" list counts Pages projects **and** Workers together. Cloudflare also applies a per-account soft limit of 100 Pages projects, so an account at exactly 100 Pages creates newer apps as Workers. If an account card says "Workers are hidden", its API token is refused by the Workers API (HTTP 403): edit that token and add **Account › Workers Scripts › Read** and **Zone › Workers Routes › Read** (editing permissions keeps the same token value), then refresh.

Cloudflare includes each project's own `*.pages.dev` hostname in the project's `domains`; it is excluded from "custom domains".

The browser fetches **each account × section (Pages / Workers+DNS) in its own server invocation**, in parallel (`getCloudflareManifest` + `getCloudflareInventoryPart`). Each invocation therefore has its own Workers subrequest budget, so growing project counts cannot push the Pages listing over the per-request limit. A failed part is reported as an error for that account, never as zero.

## Per-account token keys

`CLOUDFLARE_ACCOUNT_TOKENS_JSON` accepts a string (one read token) or an object per account:

```json
{
  "<account-id>": {
    "default": "<Zone Read + general read token>",
    "pages": "<optional Pages Read token>",
    "workers": "<optional Workers Scripts Read + Workers Routes Read token>",
    "deploy": "<optional Cloudflare Pages: Edit token — enables deploy/retry/rollback>"
  }
}
```

Tokens are never reused across accounts. `deploy` never falls back to a read token.

## Opt-in Pages deploy actions

With a `deploy` token for an account, the command center enables, per Pages project:

- **Deploy latest to production** (Git-connected projects only; Cloudflare builds the production branch HEAD — `POST /pages/projects/{name}/deployments`),
- **Retry** a failed deployment (`POST …/deployments/{id}/retry`),
- **Roll back** production to an earlier successful deployment (`POST …/deployments/{id}/rollback`).

Every action requires: a verified Cloudflare Access identity, a same-origin request (CSRF guard), a confirmation dialog, and the account's dedicated `deploy` token. Each attempt (accepted or rejected) is written to the local audit log. Remove the `deploy` key to return the account to read-only.


## Verified Worker URLs, source provenance, and repository joins (November 2026)

- Worker **Live URL** is selected from an explicitly enabled Cloudflare custom domain, otherwise from its enabled `*.workers.dev` address using the account's actual Workers subdomain, otherwise from an unambiguous zone route host and prefix. A route URL is Cloudflare routing metadata, not proof that its HTTP endpoint returned 200. An unavailable URL is labelled **URL not verified**, never `No custom domain`.
- The `workers.dev` URL requires both the account-scoped `GET /workers/subdomain` response and an explicit `subdomain.enabled === true` from the modern Workers inventory. Legacy list results lacking the enabled state will not be guessed into public URLs. The Worker detail inspector still shows independent routing diagnostics.
- Git source is taken from Pages `source.config` or the **Cloudflare Workers Builds** latest-build response `build_trigger_metadata` / `trigger.repo_connection`. Workers Builds lookup batches at most **20 script tags/request** using `GET /builds/builds/latest?external_script_ids=`. It requires **Workers CI Read** on a *user-scoped* API token; tokens without that permission leave source **unverified**. The configured Workers token is used for the lookup, so a read-only user-scoped token with both Workers metadata and Workers CI Read permissions is recommended; do **not** grant edit scope solely for this feature.
- A Workers Builds Git source confirms the repository connection for a build; it does **not** prove that the latest build's commit is serving in production. The UI intentionally omits the Worker deployment SHA until a version-to-build correlation is independently verified.
- The GitHub workspace joins Cloudflare Pages/Workers to repositories only on the **Cloudflare-reported exact owner/repo URL**, not name similarity. Where no match or reliable app homepage is known, it says **No verified app link**, not `Not deployed`. When any Cloudflare account inventory is partial, even the unmatched-deployment filter is hidden; results cannot be used as negative proof.
- For Workers built by GitHub Actions or direct Wrangler uploads, Cloudflare may have no Git source record. Do not guess from matching names; compare the deployment workflow and account settings under authorized access before manually recording an association.

### Release verification

Run `bun run typecheck`, `bun run lint`, `bun run test`, and `bun run build` in the PR CI. After release, under Cloudflare Access, reconcile per-account Worker names and live URLs with the Cloudflare dashboard; confirm enabled vs disabled `workers.dev` endpoints; compare Builds Git source against the connected repo. For accounts with no Workers CI Read permission, expect unverified Worker sources until the API token is fixed. No tokens are persisted in browser code.
