import { describe, expect, it } from "vitest";
import { workerBuildSource, workerRouteEntry, workersDevEndpoint } from "@/lib/workerProvenance";
import { normalizeWorkerScript } from "@/lib/cloudflareInventory.server";

const account = "a".repeat(32);

describe("Cloudflare-attested Worker endpoints and sources", () => {
  it("uses the account workers.dev suffix only for explicitly enabled workers", () => {
    expect(workersDevEndpoint("food-scan", { enabled: true }, "myaccount")).toBe(
      "https://food-scan.myaccount.workers.dev/",
    );
    expect(workersDevEndpoint("food-scan", { enabled: false }, "myaccount")).toBeNull();
    expect(workersDevEndpoint("food-scan", {}, "myaccount")).toBeNull();
    expect(workersDevEndpoint("food-scan", { enabled: true }, null)).toBeNull();
    expect(workersDevEndpoint("food-scan", { enabled: true }, "fake.com")).toBeNull();
  });

  it("parses concrete zone routes but rejects wildcard hosts", () => {
    expect(workerRouteEntry("example.com/api/*")).toBe("https://example.com/api/");
    expect(workerRouteEntry("api.example.com/*")).toBe("https://api.example.com/");
    expect(workerRouteEntry("*.example.com/*")).toBeNull();
    expect(workerRouteEntry("example.com/path/*/detail")).toBeNull();
  });

  it("extracts Worker GitHub source only when Cloudflare returned an actual build record", () => {
    const source = workerBuildSource({
      build_trigger_metadata: {
        provider_type: "github", provider_account_name: "example-org",
        repo_name: "real-service", branch: "main", commit_hash: "abc1234567",
      },
    });
    expect(source.repoUrl).toBe("https://github.com/example-org/real-service");
    expect(source.sourceType).toBe("github");
    expect(source.branch).toBe("main");
    expect(source.commit).toBe("abc1234567");
    expect(workerBuildSource({}).repoUrl).toBeNull();
    expect(workerBuildSource({
      build_trigger_metadata: { provider_type: "github", repo_name: "ambiguous" },
    }).repoUrl).toBeNull();
    expect(workerBuildSource({
      build_trigger_metadata: { provider_type: "github", provider_account_name: "bad/owner", repo_name: "app" },
    }).repoUrl).toBeNull();
  });

  it("links a Worker to the real enabled endpoint and source without inventing a deployed SHA", () => {
    const row = normalizeWorkerScript(account, {
      id: "test-worker", subdomain: { enabled: true }, deployed_on: "2026-11-03T12:00:00Z",
    }, [], undefined, "realaccount", {
      build_trigger_metadata: {
        provider_type: "github", provider_account_name: "acme", repo_name: "app",
        commit_hash: "abcdef123456", branch: "main",
      },
    });
    expect(row?.workersDevUrl).toBe("https://test-worker.realaccount.workers.dev/");
    expect(row?.publicUrl).toBe("https://test-worker.realaccount.workers.dev/");
    expect(row?.repoUrl).toBe("https://github.com/acme/app");
    expect(row?.repoEvidence).toBe("worker-build");
    expect(row?.commit).toBeNull();
    expect(row?.branch).toBeNull();
  });

  it("prefers a verified custom domain over workers.dev and preserves both endpoints", () => {
    const row = normalizeWorkerScript(account, {
      id: "test-worker", subdomain: { enabled: true },
    }, [{ service: "test-worker", hostname: "custom.example.com", enabled: true }],
      undefined, "realaccount");
    expect(row?.publicUrl).toBe("https://custom.example.com/");
    expect(row?.workersDevUrl).toBe("https://test-worker.realaccount.workers.dev/");
  });

  it("does not assert any public URL for disabled workers without a concrete domain or route", () => {
    const row = normalizeWorkerScript(account, { id: "internal-service", subdomain: { enabled: false } },
      [], undefined, "realaccount");
    expect(row?.publicUrl).toBeNull();
    expect(row?.workersDevUrl).toBeNull();
    expect(row?.repoUrl).toBeNull();
  });
});
