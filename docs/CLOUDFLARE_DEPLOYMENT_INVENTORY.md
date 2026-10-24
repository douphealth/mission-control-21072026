# Mission Control — Cloudflare Pages & Workers integration

## Reality and safety gates

The **Cloudflare / Unified Pages & Workers** dashboard is powered by the Cloudflare API, not a hard-coded deployment list. It is read-only: viewing, filtering, opening the Cloudflare management console and browsing deployment history do not deploy, delete, roll back, publish, or edit resources.

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

- **No mutations**: Redeploy, rollback, domain/DNS edits, traffic shifting and deleting are intentionally delegated to authenticated Cloudflare management links. They require explicit design of role-based access, confirmation, dry-run, audit log and rollback; a read token cannot perform them.
- **No live Cloudflare account data** are baked into the GitHub source. Until secrets are configured and a Cloudflare API call succeeds, the dashboard must be labelled not connected or error.
- **No claimed uptime**: "success" or "serving" reflects Cloudflare deployment metadata, not a successful independent HTTP probe. Managed routes require Zone Read + Workers Routes Read.
- **GitHub private repositories** have been removed from the browser-shipped static catalogs. To show them in an enterprise workspace, use an additional authenticated, server-side GitHub inventory service with least-privilege credentials and per-user RBAC. Do not reintroduce private names into static JavaScript.

## Rollback

Rollback is source-controlled: restore the previous known-good commit in a new PR or revert the approved merge commit; never force-push main. Restore a known-good Cloudflare deployment only after confirming origin, commit, DNS mapping and production health. Do not revoke tokens until any service depending on them has been migrated.
