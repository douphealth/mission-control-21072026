/**
 * Write actions for Cloudflare Pages. Disabled unless the owner configures a
 * dedicated per-account `deploy` token (Account > Cloudflare Pages > Edit) in
 * CLOUDFLARE_ACCOUNT_TOKENS_JSON. Read tokens are never used for writes.
 * Callers must verify Cloudflare Access AND same-origin before invoking.
 */
import {
  cloudflareRequest,
  configuredAccounts,
  deployTokenFor,
} from "@/lib/cloudflareInventory.server";

export type PagesAction = "deploy" | "retry" | "rollback";
export interface PagesActionInput {
  accountId: string;
  name: string;
  action: PagesAction;
  deploymentId?: string;
}
export interface PagesActionResult {
  ok: true;
  action: PagesAction;
  deploymentId: string | null;
  status: string;
  url: string | null;
}
export class PagesActionError extends Error {
  constructor(
    public readonly code: "not_enabled" | "invalid" | "unsupported" | "rejected",
    message: string,
  ) {
    super(message);
    this.name = "PagesActionError";
  }
}
const PROJECT = /^[a-zA-Z0-9_.-]{1,160}$/;
const DEPLOYMENT = /^[a-f0-9][a-f0-9-]{7,63}$/i;
type Envelope = { result?: Record<string, unknown> | null };
const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

/** Same-origin guard for state-changing server functions (CSRF defence). */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  let expected: string;
  try {
    expected = new URL(request.url).origin;
  } catch {
    throw new PagesActionError("invalid", "Invalid request");
  }
  if (origin ? origin !== expected : site !== "same-origin") {
    throw new PagesActionError(
      "invalid",
      "Cross-site requests cannot change Cloudflare deployments",
    );
  }
}

function safeFailure(error: unknown): PagesActionError {
  const match =
    error instanceof Error
      ? /^Cloudflare HTTP (\d{3})(?: \(CF code (\d+)\))?$/.exec(error.message)
      : null;
  if (match && (match[1] === "401" || match[1] === "403")) {
    return new PagesActionError(
      "rejected",
      "The deploy token lacks Cloudflare Pages Edit permission for this account (HTTP " +
        match[1] +
        ").",
    );
  }
  return new PagesActionError(
    "rejected",
    match
      ? "Cloudflare rejected the action (HTTP " +
          match[1] +
          (match[2] ? " / code " + match[2] : "") +
          ")."
      : "Cloudflare did not confirm the action. Check the project in the Cloudflare dashboard.",
  );
}

export async function runPagesAction(
  input: PagesActionInput,
  environment: Record<string, string | undefined> = process.env,
): Promise<PagesActionResult> {
  if (!configuredAccounts(environment).includes(input.accountId) || !PROJECT.test(input.name)) {
    throw new PagesActionError("invalid", "Unknown Cloudflare Pages project");
  }
  if (input.action !== "deploy" && !DEPLOYMENT.test(input.deploymentId || "")) {
    throw new PagesActionError("invalid", "A valid deployment id is required");
  }
  const token = deployTokenFor(input.accountId, environment);
  if (!token) {
    throw new PagesActionError(
      "not_enabled",
      "Deploy actions are disabled for this account. Add a `deploy` token with Cloudflare Pages Edit permission.",
    );
  }
  const project =
    "/accounts/" + input.accountId + "/pages/projects/" + encodeURIComponent(input.name);
  try {
    if (input.action === "deploy") {
      // Only Git-connected projects can build from their production branch;
      // Direct Upload projects require a new asset upload (wrangler).
      const current = await cloudflareRequest<Envelope>("GET", project, token);
      const type = str((current.result?.source as Record<string, unknown> | undefined)?.type);
      if (type !== "github" && type !== "gitlab") {
        throw new PagesActionError(
          "unsupported",
          "This project has no Git source. Direct Upload projects are redeployed with wrangler.",
        );
      }
    }
    const path =
      input.action === "deploy"
        ? project + "/deployments"
        : project + "/deployments/" + input.deploymentId + "/" + input.action;
    const response = await cloudflareRequest<Envelope>("POST", path, token);
    const deployment = response.result || {};
    const stage = (deployment.latest_stage || {}) as Record<string, unknown>;
    const url = str(deployment.url);
    return {
      ok: true,
      action: input.action,
      deploymentId: str(deployment.id),
      status: str(stage.status) || str(stage.name) || "queued",
      url: url && /^https:\/\/[a-z0-9.-]+\.pages\.dev\/?$/i.test(url) ? url : null,
    };
  } catch (error) {
    if (error instanceof PagesActionError) throw error;
    throw safeFailure(error);
  }
}
