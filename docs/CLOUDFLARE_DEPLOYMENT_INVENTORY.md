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

Cloudflare's Pages list endpoint supports `per_page=10`, and its `result_info` (`total_pages` / `total_count`) can under-report large accounts. Trusting it truncated a 185-project account at exactly **100**. The collector (`listAllPagesProjects` in `src/lib/cloudflareInventory.server.ts`) now behaves like wrangler:

- keeps requesting pages until Cloudflare returns a short or empty page; metadata is only a prefetch hint and a lower-bound check;
- de-duplicates by project name; fails closed (explicit warning, never a silent partial count) if Cloudflare repeats a page or returns fewer projects than it reports;
- each account card shows the proof, e.g. "All 185 Pages projects listed (19 API pages). Cloudflare metadata reported only 100".

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
