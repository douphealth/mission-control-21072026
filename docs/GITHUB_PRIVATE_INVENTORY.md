# Private GitHub inventory (Mission Control)

This feature adds a **private, authenticated** supplement to the dated 229-repository public Portfolio Atlas. It is disabled unless Cloudflare Access is configured and access is granted server-side. No private repository names, URLs, or account totals are bundled in public JavaScript.

## Configuration

Provide the following as **server secrets**, not as client-side settings or Vite variables:

- \`CLOUDFLARE_ACCESS_TEAM_DOMAIN\` and \`CLOUDFLARE_ACCESS_AUD\` — as described in \`docs/CLOUDFLARE_DEPLOYMENT_INVENTORY.md\`.
- \`GITHUB_PORTFOLIO_TOKENS_JSON\` — a JSON map of the four supported account logins (`douphealth`, `Papalexios`, `papalexios001-wq`, `papalexios01`) to that account's **own** fine-grained read token. Ensure each token can list both public and private repositories for its owner. The API verifies the token's GitHub user identity before reading. Do not paste or commit tokens into the repository.
- Optionally \`CLOUDFLARE_ACCESS_ALLOWED_EMAILS\` or (preferably) a restrictive Cloudflare Access group policy.

The ChatGPT GitHub connector used to audit the initial public snapshot is **not** an OAuth connector inside a deployed Mission Control app. It does not set these runtime secrets.

## Usage

Open Portfolio Atlas and select **Load authorized inventory**. Private repo metadata is fetched from the GitHub REST API under a verified Cloudflare Access JWT. GitHub API and authorization failures are reported without echoing token values. The feature is intentionally read-only.

## Enterprise limitations

This is a single-workspace Access-protected inventory, not a multi-tenant SaaS. Users cannot connect arbitrary GitHub accounts from the frontend; per-user repository grants, tenant storage, audit logging and delegated OAuth are not implemented. Do not market this as self-service enterprise account management until those controls are built and independently tested.

Existing git history of a public repository is **not** erased by deleting private identifiers from the latest commit. Review exposure and remediate through the repository owner's security process rather than rewriting history automatically.

## GitHub and Cloudflare operator controls (2026-11)

The GitHub Portfolio uses real authenticated/public repository inventory, Cloudflare Pages/Workers metadata, and operator-maintained app URLs, with the origin of every app URL displayed separately. Existing links are not treated as HTTP uptime proofs. Repository filters include account, priority, activity, language, visibility, recorded app/deployment linkage, and source confidence. Named filter views are stored on the current device only; they contain no tokens.

**On-demand repository diagnostics:** Use the repository actions menu's **Inspect CI, PRs & deployments** entry. Under Cloudflare Access, a server-side read token for that GitHub account retrieves the latest default-branch Actions run, the three most recently updated open PRs, and five recent GitHub deployment records. GitHub's `open_issues_count` includes PRs, so it is not presented as a precise PR-only count. Diagnostics do not run automatically for every repo; this prevents API rate limits and excessive usage. A recent push is not proof of a deployment.

**Cloudflare operations:** Each configured account reports Pages, Workers, and zones independently, with source-time, coverage, and permission errors. Filters include source, kind and endpoint, plus status/sort/account. If Workers read scopes fail, the UI must show unknown/partial coverage rather than zero Workers. Cloudflare deployment metadata is not an independent public uptime test. Cloudflare PR merges/deployments require separate authorization.

The optional fourth GitHub owner needs its own token in `GITHUB_PORTFOLIO_TOKENS_JSON`; no credentials are committed. Authenticated inventory does **not** fall back to unauthenticated fetching of private repository information.
