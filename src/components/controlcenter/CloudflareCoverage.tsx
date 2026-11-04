import { AlertTriangle, ExternalLink, ShieldCheck } from "lucide-react";
import { TruthBadge } from "@/components/TruthUI";
import type {
  CloudflareAccountSummary,
  CloudflareInventory,
} from "@/lib/cloudflareInventory.server";

const TOKEN_SOURCE_LABEL: Record<
  NonNullable<CloudflareAccountSummary["workersTokenSource"]>,
  string
> = {
  workers: 'this account\'s "workers" token',
  pages: 'this account\'s "pages" token',
  default: 'this account\'s "default" token',
  account: "this account's token in CLOUDFLARE_ACCOUNT_TOKENS_JSON",
  global: "the shared CLOUDFLARE_API_TOKEN",
  none: "not reported",
};
/** Cloudflare's documented per-account Pages soft limit (raised only on request). */
const PAGES_PROJECT_SOFT_LIMIT = 100;

export const workerGap = (a: CloudflareAccountSummary) => a.errors.some((e) => /worker/i.test(e));
export const pagesGap = (a: CloudflareAccountSummary) => a.errors.some((e) => /pages/i.test(e));

const truthOf = (a: CloudflareAccountSummary) =>
  a.truthState === "partial"
    ? "partial"
    : a.truthState === "live"
      ? "live"
      : a.truthState === "not_connected"
        ? "not_connected"
        : "error";

/** Compact, clickable account strip: one chip per account, filters the project list. */
export function CloudflareAccountStrip({
  inventory,
  selected,
  onSelect,
}: {
  inventory: CloudflareInventory;
  selected: string;
  onSelect: (accountId: string) => void;
}) {
  if (inventory.accountDetails.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Cloudflare accounts">
      {inventory.accountDetails.map((a) => {
        const active = selected === a.accountId;
        const gap = pagesGap(a) || workerGap(a);
        return (
          <button
            key={a.accountId}
            type="button"
            onClick={() => onSelect(active ? "all" : a.accountId)}
            aria-pressed={active}
            title={"Filter projects to " + a.label}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-left text-xs transition ${
              active
                ? "border-primary/50 bg-primary/10"
                : "border-border/70 bg-card/70 hover:border-primary/35"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                a.truthState === "live" && !gap
                  ? "bg-emerald-500"
                  : a.truthState === "not_connected"
                    ? "bg-muted-foreground/40"
                    : "bg-amber-500"
              }`}
            />
            <span className="font-semibold">{a.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {pagesGap(a) && !a.pagesCount ? "—" : a.pagesCount} Pages ·{" "}
              {workerGap(a) ? (a.workersCount ? a.workersCount + "+" : "—") : a.workersCount}{" "}
              Workers
            </span>
            {gap && (
              <AlertTriangle size={12} className="text-amber-500" aria-label="Coverage gap" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Full coverage explanation and fix steps. Collapsed unless something is
 * actually incomplete, so a healthy estate is not buried under instructions.
 */
export default function CloudflareCoverage({
  inventory,
  onSelectAccount,
  selectedAccount,
  open,
  onOpenChange,
}: {
  inventory: CloudflareInventory;
  onSelectAccount: (accountId: string) => void;
  selectedAccount: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const anyPagesGap = inventory.accountDetails.some(pagesGap);
  const anyWorkerGap = inventory.accountDetails.some(workerGap);
  const needsAttention = anyPagesGap || anyWorkerGap || inventory.errors.length > 0;
  return (
    <details
      className="rounded-2xl border border-border/70 bg-card/60 p-3.5"
      open={open}
      onToggle={(e) => onOpenChange((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-semibold">
        {needsAttention ? (
          <AlertTriangle size={14} className="text-amber-500" />
        ) : (
          <ShieldCheck size={14} className="text-emerald-500" />
        )}
        Coverage & setup
        <span className="text-xs font-normal text-muted-foreground">
          {needsAttention
            ? inventory.errors.length +
              " warning(s)" +
              (anyWorkerGap ? " · Workers incomplete" : "") +
              (anyPagesGap ? " · Pages incomplete" : "")
            : "Every authorized account was read completely"}
        </span>
      </summary>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {inventory.accountDetails.map((a) => {
          const underReported =
            typeof a.pagesReportedTotal === "number" && a.pagesReportedTotal < a.pagesCount;
          return (
            <div
              key={a.accountId}
              className="rounded-2xl border border-border bg-card/70 p-4 text-xs shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onSelectAccount(selectedAccount === a.accountId ? "all" : a.accountId)
                  }
                  className={`break-words text-left text-sm font-semibold hover:text-primary ${selectedAccount === a.accountId ? "text-primary" : ""}`}
                  title="Filter the project list to this account"
                >
                  {a.label}
                </button>
                <TruthBadge state={truthOf(a)} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/30 px-3 py-2.5 text-center">
                <span>
                  <strong className="block text-lg tabular-nums">
                    {pagesGap(a) && !a.pagesCount ? "—" : a.pagesCount}
                  </strong>
                  Pages
                </span>
                <span>
                  <strong className="block text-lg tabular-nums">
                    {workerGap(a) ? (a.workersCount ? a.workersCount + "+" : "—") : a.workersCount}
                  </strong>
                  Workers{workerGap(a) ? " (unverified)" : ""}
                </span>
                <span>
                  <strong className="block text-lg tabular-nums">{a.zonesCount}</strong>Zones
                </span>
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-muted-foreground">
                {pagesGap(a) ? (
                  <>
                    <AlertTriangle size={13} className="mt-px shrink-0 text-amber-500" /> Pages list
                    incomplete — see warnings.
                  </>
                ) : (
                  <>
                    <ShieldCheck size={13} className="mt-px shrink-0 text-emerald-500" />
                    All {a.pagesCount} Pages projects listed
                    {a.pagesApiRequests ? " (" + a.pagesApiRequests + " API pages)" : ""}.
                    {underReported
                      ? " Cloudflare metadata reported only " +
                        a.pagesReportedTotal +
                        "; full pagination verified the rest."
                      : ""}
                    {a.pagesCount >= PAGES_PROJECT_SOFT_LIMIT
                      ? " This account is at Cloudflare's 100-project Pages limit, so newer apps here are Workers."
                      : ""}
                  </>
                )}
              </p>
              {workerGap(a) && (
                <div className="mt-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-100">
                  <p className="font-semibold">
                    Workers are hidden — Cloudflare&apos;s &ldquo;Workers &amp; Pages&rdquo; total
                    includes them, so it will be higher than {a.pagesCount}.
                  </p>
                  <p className="mt-1">
                    Cloudflare refuses this account&apos;s token on the Workers API (HTTP 403).
                    Token used here:{" "}
                    <strong>{TOKEN_SOURCE_LABEL[a.workersTokenSource || "none"]}</strong>.
                  </p>
                  {(() => {
                    const peer = inventory.accountDetails.find(
                      (o) =>
                        o.accountId !== a.accountId &&
                        !workerGap(o) &&
                        o.workersTokenSource === "global" &&
                        a.workersTokenSource === "global",
                    );
                    return peer ? (
                      <p className="mt-1">
                        The same token <strong>can</strong> read Workers on {peer.label}, so it is
                        not covering this account. Either add this account under the token&apos;s
                        <em> Account Resources</em> (the token&apos;s creator must have Workers
                        access here), or add a separate{" "}
                        <code className="rounded bg-muted px-1">workers</code> token for this
                        account.
                      </p>
                    ) : null;
                  })()}
                  <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                    <li>
                      Sign in to Cloudflare as a user who can see this account&apos;s Workers (its
                      owner), then open API tokens.
                    </li>
                    <li>
                      Edit that token, or create a custom token, with{" "}
                      <strong>Account › Workers Scripts › Read</strong> and{" "}
                      <strong>Zone › Workers Routes › Read</strong>, with this account selected
                      under Account Resources.
                    </li>
                    <li>
                      Editing keeps the token value: just press Refresh. A new token goes in{" "}
                      <code className="rounded bg-muted px-1">CLOUDFLARE_ACCOUNT_TOKENS_JSON</code>{" "}
                      as{" "}
                      <code className="rounded bg-muted px-1">
                        {'"' + a.accountId.slice(0, 6) + "…" + '": { "workers": "…" }'}
                      </code>
                      , then redeploy.
                    </li>
                  </ol>
                  <a
                    href="https://dash.cloudflare.com/profile/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 font-semibold text-primary"
                  >
                    Open Cloudflare API tokens <ExternalLink size={12} />
                  </a>
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span
                  className="text-muted-foreground"
                  title="Add a per-account `deploy` token (Cloudflare Pages: Edit) to CLOUDFLARE_ACCOUNT_TOKENS_JSON to enable"
                >
                  Deploy actions:{" "}
                  {a.deployEnabled ? (
                    <strong className="text-emerald-600 dark:text-emerald-400">enabled</strong>
                  ) : (
                    "off (read-only)"
                  )}
                </span>
                <a
                  href={"https://dash.cloudflare.com/" + a.accountId + "/workers-and-pages"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-primary"
                >
                  Workers & Pages <ExternalLink size={12} />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {inventory.errors.length > 0 && (
        <div className="mt-3 rounded-2xl border border-amber-500/35 bg-amber-500/5 p-3 text-sm">
          <p className="text-xs font-semibold">
            <AlertTriangle size={14} className="mr-1.5 inline text-amber-500" />
            {inventory.errors.length} coverage warning(s)
            {anyPagesGap ? "" : " — Pages inventory is complete; these affect Workers/DNS only"}
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {inventory.errors.map((error, index) => (
              <li
                key={index}
                className="rounded-lg border border-border/60 bg-background/50 px-3 py-2"
              >
                {error}
              </li>
            ))}
          </ul>
          {anyWorkerGap && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Fix: create an account-scoped token with <em>Workers Scripts: Read</em> (and{" "}
              <em>Zone › Workers Routes: Read</em>) and add it as the
              <code className="mx-1 rounded bg-muted px-1">workers</code>key for that account in
              CLOUDFLARE_ACCOUNT_TOKENS_JSON. Unavailable data is never shown as zero.
            </p>
          )}
        </div>
      )}
    </details>
  );
}
