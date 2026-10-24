# Private GitHub inventory (Mission Control)

This feature adds a **private, authenticated** supplement to the dated 229-repository public Portfolio Atlas. It is disabled unless Cloudflare Access is configured and access is granted server-side. No private repository names, URLs, or account totals are bundled in public JavaScript.

## Configuration

Provide the following as **server secrets**, not as client-side settings or Vite variables:

- \`CLOUDFLARE_ACCESS_TEAM_DOMAIN\` and \`CLOUDFLARE_ACCESS_AUD\` — as described in \`docs/CLOUDFLARE_DEPLOYMENT_INVENTORY.md\`.
- \`GITHUB_PORTFOLIO_TOKENS_JSON\` — a JSON map of the three configured account logins to that account's **own** fine-grained read token. Ensure each token can list both public and private repositories for its owner. The API verifies the token's GitHub user identity before reading. Do not paste or commit tokens into the repository.
- Optionally \`CLOUDFLARE_ACCESS_ALLOWED_EMAILS\` or (preferably) a restrictive Cloudflare Access group policy.

The ChatGPT GitHub connector used to audit the initial public snapshot is **not** an OAuth connector inside a deployed Mission Control app. It does not set these runtime secrets.

## Usage

Open Portfolio Atlas and select **Load authorized inventory**. Private repo metadata is fetched from the GitHub REST API under a verified Cloudflare Access JWT. GitHub API and authorization failures are reported without echoing token values. The feature is intentionally read-only.

## Enterprise limitations

This is a single-workspace Access-protected inventory, not a multi-tenant SaaS. Users cannot connect arbitrary GitHub accounts from the frontend; per-user repository grants, tenant storage, audit logging and delegated OAuth are not implemented. Do not market this as self-service enterprise account management until those controls are built and independently tested.

Existing git history of a public repository is **not** erased by deleting private identifiers from the latest commit. Review exposure and remediate through the repository owner's security process rather than rewriting history automatically.
