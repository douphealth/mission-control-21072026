import { describe, expect, it, vi } from "vitest";
import { parseBuildInfo, readBuildInfo } from "@/lib/buildInfo";

const manifest = { app: "mission-control", commit: "d6eb1cdcb360a552dc7695b59cfa1e2c9a519b0b", builtAt: "2026-11-03T13:24:23.000Z" };

describe("deployment manifest", () => {
  it("only shows a version for this app with a full commit and a valid build timestamp", () => {
    expect(parseBuildInfo(manifest)).toEqual({ commit: manifest.commit, builtAt: manifest.builtAt });
    expect(parseBuildInfo({ ...manifest, app: "other-app" })).toBeNull();
    expect(parseBuildInfo({ ...manifest, commit: "v9.1" })).toBeNull();
    expect(parseBuildInfo({ ...manifest, commit: "unknown" })).toBeNull();
    expect(parseBuildInfo({ ...manifest, builtAt: "not a date" })).toBeNull();
    expect(parseBuildInfo(null)).toBeNull();
  });

  it("reads the generated current-origin manifest without stale cache or sign-in redirects", async () => {
    const signal = new AbortController().signal;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(manifest), { headers: { "Content-Type": "application/json" } }));
    expect(await readBuildInfo(signal, fetcher)).toEqual({ commit: manifest.commit, builtAt: manifest.builtAt });
    expect(fetcher).toHaveBeenCalledWith("/build-info.json", { cache: "no-store", redirect: "error", signal });
  });

  it("leaves the build unavailable for missing, offline or non-JSON responses", async () => {
    const signal = new AbortController().signal;
    const missing = vi.fn<typeof fetch>().mockResolvedValue(new Response("missing", { status: 404 }));
    const offline = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    const signInPage = vi.fn<typeof fetch>().mockResolvedValue(new Response("<html>Sign in</html>"));
    expect(await readBuildInfo(signal, missing)).toBeNull();
    expect(await readBuildInfo(signal, offline)).toBeNull();
    expect(await readBuildInfo(signal, signInPage)).toBeNull();
  });
});
