import { describe, it, expect } from "vitest";
import { stripRedactedFields } from "@/lib/audit";
import { REDACTED } from "@/lib/secrets";

describe("stripRedactedFields", () => {
  it("never restores a redacted placeholder over a live credential", () => {
    const snapshot = { id: "1", label: "Old label", password: REDACTED };
    const current = { id: "1", label: "New label", password: "real-secret" };
    const out = stripRedactedFields(snapshot, current) as any;
    expect(out.label).toBe("Old label");
    expect(out.password).toBe("real-secret");
  });

  it("drops secret fields entirely when the record has no current value", () => {
    const out = stripRedactedFields({ id: "1", apiKey: REDACTED, title: "x" }) as any;
    expect("apiKey" in out).toBe(false);
    expect(out.title).toBe("x");
  });

  it("handles nested objects", () => {
    const out = stripRedactedFields(
      { id: "1", creds: { username: "admin", wpPassword: REDACTED } },
      { id: "1", creds: { username: "admin", wpPassword: "live" } },
    ) as any;
    expect(out.creds.wpPassword).toBe("live");
    expect(out.creds.username).toBe("admin");
  });
});
