import { describe, it, expect } from "vitest";
import { stripSecretsForExport } from "@/lib/secrets";

describe("backup export policy", () => {
  it("drops credential fields entirely instead of redacting them", () => {
    const out = stripSecretsForExport({
      credentials: [
        { id: "1", label: "Host", username: "admin", password: "hunter2", secretRef: "ref_1" },
      ],
      websites: [
        { id: "w", wpUsername: "adm", wpPassword: "p", hostingPassword: "h", wpSecretRef: "ref_2" },
      ],
    }) as any;

    const cred = out.credentials[0];
    expect("password" in cred).toBe(false);
    expect(cred.secretRef).toBe("ref_1");
    expect(cred.username).toBe("admin");

    const site = out.websites[0];
    expect("wpPassword" in site).toBe(false);
    expect("hostingPassword" in site).toBe(false);
    expect(site.wpSecretRef).toBe("ref_2");
  });

  it("never emits vault ciphertext or encryption material", () => {
    const out = stripSecretsForExport({
      vaultBlob: "mcenc:v2:abc",
      note: "wcapi:legacy-cipher",
      keyMaterial: "raw",
      salt: "xyz",
      title: "ok",
    }) as any;
    expect("vaultBlob" in out).toBe(false);
    expect("keyMaterial" in out).toBe(false);
    expect("salt" in out).toBe(false);
    expect(out.note).not.toContain("wcapi:");
    expect(out.title).toBe("ok");
  });

  it("produces JSON with no obvious secret material", () => {
    const json = JSON.stringify(
      stripSecretsForExport({
        a: { apiKey: "sk-live-123", dbConnectionString: "postgres://u:p@h/db" },
        tasks: [{ id: "t", title: "Do it" }],
      }),
    );
    expect(json).not.toContain("sk-live-123");
    expect(json).not.toContain("postgres://");
    expect(json).toContain("Do it");
  });
});
