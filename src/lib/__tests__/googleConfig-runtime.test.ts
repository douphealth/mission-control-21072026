import { beforeEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({ env: {} as Record<string, string> }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => ({ handler: (fn: () => unknown) => fn }) }));
vi.mock("@/lib/cloudflareRuntimeEnv.server", () => ({ readCloudflareRuntimeEnv: async () => runtime.env }));

describe("Google identity on Cloudflare runtime", () => {
  beforeEach(() => { runtime.env = {}; });
  it("returns the configured native runtime identity even without a process environment value", async () => {
    runtime.env = { GOOGLE_OAUTH_CLIENT_ID: "123456-native.apps.googleusercontent.com" };
    const { getServerGoogleClientId } = await import("@/lib/googleConfig.functions");
    expect(await getServerGoogleClientId()).toEqual({ clientId: "123456-native.apps.googleusercontent.com" });
  });
  it("accepts the deployment's legacy public Google setting", async () => {
    runtime.env = { GOOGLE_OAUTH_CLIENT_ID: "invalid", VITE_GOOGLE_CLIENT_ID: "123456-legacy.apps.googleusercontent.com" };
    const { getServerGoogleClientId } = await import("@/lib/googleConfig.functions");
    expect(await getServerGoogleClientId()).toEqual({ clientId: "123456-legacy.apps.googleusercontent.com" });
  });
  it("never returns unrelated private credentials", async () => {
    runtime.env = { GOOGLE_CLIENT_SECRET: "private-test-value" };
    const { getServerGoogleClientId } = await import("@/lib/googleConfig.functions");
    expect(await getServerGoogleClientId()).toEqual({ clientId: "" });
  });
});