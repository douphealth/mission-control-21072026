import { describe, expect, it } from "vitest";
import { parseCredentialBatch } from "@/lib/credentialBulk";

describe("credential bulk parser", () => {
  it("parses spreadsheet TSV with common header aliases", () => {
    const result = parseCredentialBatch(
      [
        "Label\tService\tURL\tEmail\tPassword\tAPI Token\tCategory",
        "Cloudflare Main\tCloudflare\tdash.cloudflare.com\tme@example.com\tsecret-one\tcf-token\tInfrastructure",
        "GitHub\tGitHub\thttps://github.com\tdev@example.com\tsecret-two\tgh-token\tDevelopment",
      ].join("\n"),
    );
    expect(result.format).toBe("delimited");
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      label: "Cloudflare Main",
      username: "me@example.com",
      url: "https://dash.cloudflare.com",
      apiKey: "cf-token",
    });
  });

  it("parses several key-value credential blocks", () => {
    const result = parseCredentialBatch(
      [
        "Label: WordPress Site",
        "Service: WordPress",
        "URL: example.com/wp-admin",
        "Username: admin",
        "Password: pass-one",
        "",
        "Label: Stripe",
        "Service: Stripe",
        "API Key: sk_test_value",
        "Category: Payments",
      ].join("\n"),
    );
    expect(result.format).toBe("key-value");
    expect(result.items).toHaveLength(2);
    expect(result.items[1].category).toBe("Payments");
  });

  it("parses headerless pipe rows for fast paste", () => {
    const result = parseCredentialBatch(
      "GitHub | GitHub | https://github.com | alex | pass | token | Development | primary account",
    );
    expect(result.format).toBe("lines");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].notes).toBe("primary account");
  });

  it("parses JSON arrays without requiring ids", () => {
    const result = parseCredentialBatch(
      JSON.stringify([
        { label: "Service A", username: "alex", password: "one" },
        { label: "Service B", apiKey: "two" },
      ]),
    );
    expect(result.format).toBe("json");
    expect(result.items).toHaveLength(2);
  });

  it("deduplicates identical rows inside one paste", () => {
    const row = "GitHub | GitHub | github.com | alex | pass | token | Development";
    const result = parseCredentialBatch(`${row}\n${row}`);
    expect(result.items).toHaveLength(1);
  });
});
