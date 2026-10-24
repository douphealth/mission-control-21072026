import { describe, expect, it } from "vitest";
import {
  configuredAccounts, normalizePagesProject, normalizeWorkerScript,
} from "@/lib/cloudflareInventory.server";
import { CloudflareAccessError, requireCloudflareViewer } from "@/lib/cloudflareAccess.server";

const ACCOUNT = "a".repeat(32);

describe("Cloudflare production inventory normalization", () => {
  it("chooses canonical production deployment rather than latest preview", () => {
    const p = normalizePagesProject(ACCOUNT, {
      name: "example-product",
      subdomain: "example-product.pages.dev",
      domains: ["my-app.example.com"],
      source: { type: "github", config: {
        owner: "example-owner", repo_name: "example-repo", production_branch: "main",
      }},
      canonical_deployment: {
        id: "production-001", created_on: "2026-10-01T00:00:00Z",
        latest_stage: { status: "success" },
        deployment_trigger: { metadata: { branch: "main", commit_hash: "abcdef123" }},
      },
      latest_deployment: {
        id: "preview-999",
        latest_stage: { status: "failure" },
        deployment_trigger: { metadata: { branch: "preview", commit_hash: "bad000" }},
      },
    });
    expect(p?.deploymentId).toBe("production-001");
    expect(p?.commit).toBe("abcdef123");
    expect(p?.branch).toBe("main");
    expect(p?.status).toBe("success");
    expect(p?.publicUrl).toBe("https://my-app.example.com/");
    expect(p?.projectUrl).toBe(
      "https://dash.cloudflare.com/" + ACCOUNT + "/pages/view/example-product");
    expect(p?.repoUrl).toBe("https://github.com/example-owner/example-repo");
  });
  it("never marks a missing deployment as healthy", () => {
    const result = normalizePagesProject(ACCOUNT, { name: "empty-project" });
    expect(result?.status).toBe("unknown");
    expect(result?.deploymentId).toBeNull();
    expect(result?.statusSource).toBe("unavailable");
    expect(result?.publicUrl).toBeNull();
  });
  it("shows only enabled worker custom domains and real routes", () => {
    const worker = normalizeWorkerScript(
      ACCOUNT,
      { id: "mail-worker", routes: [{script:"mail-worker",pattern:"mail.example.com/*"}] },
      [{ service:"mail-worker",hostname:"mail.example.com",enabled:true },
       { service:"mail-worker",hostname:"private.example.com",enabled:false },
       { service:"other-worker",hostname:"other.example.com",enabled:true }],
      { id:"deployment-x",created_on:"2026-10-10T10:00:00Z" },
    );
    expect(worker?.domains).toEqual(["mail.example.com"]);
    expect(worker?.routes).toEqual(["mail.example.com/*"]);
    expect(worker?.publicUrl).toBe("https://mail.example.com/");
    expect(worker?.deploymentId).toBe("deployment-x");
    expect(worker?.repoUrl).toBeNull();
  });
  it("deduplicates and validates account identifiers without leaking secrets", () => {
    expect(configuredAccounts({ CLOUDFLARE_ACCOUNT_IDS:
      ACCOUNT + "," + ACCOUNT + ",invalid," + "b".repeat(32) }))
      .toEqual([ACCOUNT, "b".repeat(32)]);
  });
});

describe("infrastructure security", () => {
  it("fails closed when Cloudflare Access policy is missing", async () => {
    await expect(requireCloudflareViewer(undefined, {}))
      .rejects.toMatchObject({ code: "not_configured" });
  });
  it("rejects absent Access JWT without attempting external API calls", async () => {
    const env = { CLOUDFLARE_ACCESS_TEAM_DOMAIN: "myteam.cloudflareaccess.com",
      CLOUDFLARE_ACCESS_AUD: "the-required-audience" };
    await expect(requireCloudflareViewer(new Request("https://example.com"), env))
      .rejects.toMatchObject({ code: "unauthorized" });
  });
  it("uses Cloudflare specific denial errors", () => {
    expect(new CloudflareAccessError("unauthorized").name).toBe("CloudflareAccessError");
  });
});
