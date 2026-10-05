import { describe, expect, it } from "vitest";
import { detectApiKeyValue, parseCredentialBatch } from "@/lib/credentialBulk";

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


describe("API key intelligence", () => {
  it("recognizes provider-specific API keys with high confidence", () => {
    expect(detectApiKeyValue("ghp_abcdefghijklmnopqrstuvwxyz0123456789", "GitHub")).toMatchObject({
      isApiKey: true,
      confidence: "high",
      provider: "GitHub",
      category: "Development",
    });
    expect(detectApiKeyValue("sk_live_1234567890abcdefABCDEF", "Stripe")).toMatchObject({
      isApiKey: true,
      confidence: "high",
      provider: "Stripe",
      category: "Payments",
    });
    expect(detectApiKeyValue("AIzaSyA123456789012345678901234567890123", "Google API")).toMatchObject({
      isApiKey: true,
      confidence: "high",
      provider: "Google",
    });
  });

  it("moves a provider API key out of the password slot automatically", () => {
    const result = parseCredentialBatch(
      "OpenAI | OpenAI | https://platform.openai.com | alex@example.com | sk-proj-abcdefghijklmnopqrstuvwxyz012345 | | AI Tools",
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].password).toBe("");
    expect(result.items[0].apiKey).toContain("sk-proj-");
    expect(result.items[0].service).toBe("OpenAI");
  });

  it("understands loose provider plus API key lines", () => {
    const result = parseCredentialBatch(
      [
        "GitHub ghp_abcdefghijklmnopqrstuvwxyz0123456789",
        "Stripe sk_live_1234567890abcdefABCDEF",
      ].join("\n"),
    );
    expect(result.items).toHaveLength(2);
    expect(result.items[0].apiKey).toContain("ghp_");
    expect(result.items[1].apiKey).toContain("sk_live_");
  });

  it("understands unknown token-like values when an API label is explicit", () => {
    const result = parseCredentialBatch(
      [
        "Label: Internal API",
        "API token: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      ].join("\n"),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].apiKey).toBe("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    expect(result.items[0].password).toBe("");
  });
});
