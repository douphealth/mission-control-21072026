import { createHash, webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stableBootstrapId } from "../bootstrapIdentity";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("portable deterministic record identities", () => {
  it("uses native SHA-256 when SubtleCrypto is available", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const digest = vi.spyOn(webcrypto.subtle, "digest");
    expect(await stableBootstrapId("feed-v2", "abc")).toBe(
      "feed-v2-ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(digest).toHaveBeenCalledOnce();
  });

  it("keeps the identical persisted ID on HTTP origins without SubtleCrypto", async () => {
    const identity = "https://github.blog/changelog/";
    vi.stubGlobal("crypto", webcrypto);
    const secureId = await stableBootstrapId("feed-v2", identity);
    const random = vi.fn();
    vi.stubGlobal("crypto", { getRandomValues: random });
    expect(await stableBootstrapId("feed-v2", identity)).toBe(secureId);
    expect(random).not.toHaveBeenCalled();
  });

  it("supports environments without a crypto global and retains standard SHA-256 vectors", async () => {
    vi.stubGlobal("crypto", undefined);
    expect(await stableBootstrapId("empty", "")).toBe(
      "empty-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(await stableBootstrapId("abc", "abc")).toBe(
      "abc-ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("matches an independent SHA-256 implementation for UTF-8 and block boundaries", async () => {
    vi.stubGlobal("crypto", { subtle: undefined });
    const inputs = [
      "mention|https://example.test/Ελλάδα?q=🎯|品牌",
      "\0\u0001\u007f\u0080\ud800",
      ...[1, 55, 56, 63, 64, 65, 119, 120, 127, 128, 129, 1024, 1_000_000].map((length) =>
        "a".repeat(length),
      ),
    ];
    for (const identity of inputs) {
      expect(await stableBootstrapId("record-v2", identity)).toBe(
        `record-v2-${createHash("sha256").update(identity, "utf8").digest("hex")}`,
      );
    }
  });
});
