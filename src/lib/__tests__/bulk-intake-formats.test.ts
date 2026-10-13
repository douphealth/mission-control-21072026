import { describe, expect, it } from "vitest";
import { previewBulkIntake, PRIVATE } from "@/lib/bulkIntake";
import { splitPromptCollection } from "@/lib/promptSplit";
const headers = ["Program", "Category", "Type", "Affiliate/referral link", "Strategy status", "Verdict", "HTTP", "Final URL", "Tracking evidence", "Notes", "Affiliate Dashboard", "Username", "Password"];
const partner = ["Example Partner", "Social Media", "Ambassador/referral", "https://example.com/Alex?sig=A%2Bb&ref=case#Offer", "USE NOW", "APPROVED", "200", "https://example.com/", "Existing referral", "User supplied notes", "https://example.com/dashboard", "private@example.com", "synthetic-private-value"];

describe("real-world credential clipboard formats (synthetic records only)", () => {
  it("retains 441 valid rows alongside five actionable errors", () => {
    const lines = ["Account name\tDescription\tLogin URL\tEmail\tPassword\tDate\tNotes"];
    for (let i = 0; i < 446; i++) lines.push([9, 20, 21, 30, 31].includes(i) ? "\tOnly metadata\t\t\t\t\t" : `Account ${i}\tUseful description\thttps://example.com/${i}\tu${i}@example.com\tfixture-${i}\t22/4/2020\tImported note`);
    const result = previewBulkIntake("credentials", lines.join("\n"));
    expect(result.rows).toHaveLength(441); expect(result.issues).toHaveLength(5); expect(result.fatal).toBe(false);
    expect(result.table?.hasHeader).toBe(true); expect(result.rows[0].category).toBe("General");
    expect(result.rows[0].notes).toContain("Date: 22/4/2020"); expect(result.rows[0].notes).toContain("Useful description");
    expect(result.issues[0].line).toBe(11); expect(JSON.stringify(result.issues)).not.toContain("fixture-");
  });
  it("recognizes headerless dates rather than placing them in categories", () => {
    const result = previewBulkIntake("credentials", "Tool\tService\thttps://example.com\tperson@example.com\tfixture\t\t22/4/2020\tUseful note");
    expect(result.rows[0]).toMatchObject({ category: "General", password: "fixture", label: "Tool" });
    expect(result.rows[0].notes).toContain("22/4/2020"); expect(result.table?.needsReview).toBe(true);
  });
  it("preserves quoted multiline cells and exact password whitespace", () => {
    const result = previewBulkIntake("credentials", 'Label,Email,Password,Notes\r\nAccount,a@example.com,"  fixture with spaces  ","Line one\r\nLine two"\r\nOther,b@example.com,fixture-two,Note');
    expect(result.issues).toEqual([]); expect(result.rows).toHaveLength(2);
    expect(result.rows[0].password).toBe("  fixture with spaces  "); expect(result.rows[0].notes).toBe("Line one\r\nLine two");
  });
  it("supports BOM and semicolon headings", () => {
    const result = previewBulkIntake("credentials", '\uFEFFAccount name;Login URL;Email;Password;Date\nService;https://example.com;a@example.com;fixture;12/1/2022');
    expect(result.issues).toEqual([]); expect(result.rows[0]).toMatchObject({ url: "https://example.com", category: "General" });
  });
  it("allows explicit mapping of arbitrary column order", () => {
    const result = previewBulkIntake("credentials", "a@example.com\tfixture\tService\thttps://example.com", { hasHeader: false, columns: ["username", "password", "label", "url"] });
    expect(result.rows[0]).toMatchObject({ label: "Service", username: "a@example.com", password: "fixture", url: "https://example.com" });
  });
  it("does not send tabular WordPress logins through hosting-dump parsing", () => {
    const result = previewBulkIntake("credentials", "Label\tURL\tPassword\nA\thttps://example.com/wp-admin\tfixture\nB\thttps://example.org/wp-admin\tfixture");
    expect(result.rows).toHaveLength(2); expect(result.table?.hasHeader).toBe(true);
  });
  it("reports invalid JSON rows without throwing away valid ones", () => {
    const result = previewBulkIntake("credentials", '[{"label":"A","password":"fixture"},{"label":"No data"},null]');
    expect(result.rows).toHaveLength(1); expect(result.issues).toHaveLength(2); expect(result.fatal).toBe(false);
  });
  it("blocks malformed quotes, excessive rows and oversized input", () => {
    expect(previewBulkIntake("credentials", 'Label,Password,Notes\nA,fixture,"unfinished').fatal).toBe(true);
    expect(previewBulkIntake("credentials", "x".repeat(1_000_001)).fatal).toBe(true);
    expect(previewBulkIntake("links", Array(1001).fill("https://example.com").join("\n")).fatal).toBe(true);
    expect(previewBulkIntake("prompts", "\u03b1".repeat(600_000)).fatal).toBe(true);
  });
  it("keeps legacy named blocks usable", () => {
    const result = previewBulkIntake("credentials", "Label: WordPress\nURL: example.com/wp-admin\nUsername: admin\nPassword: fixture");
    expect(result.rows).toHaveLength(1); expect(result.issues).toEqual([]);
  });
});

describe("affiliate tables and privacy", () => {
  it.each(["\t", ",", ";"])("maps human headings with %s and excludes recognized private columns", delimiter => {
    const result = previewBulkIntake("links", [headers.join(delimiter), partner.join(delimiter)].join("\n"));
    expect(result.issues).toEqual([]); expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ title: "Example Partner", category: "Social Media", kind: "affiliate", url: partner[3] });
    expect(result.rows[0].description).toContain("Strategy status: USE NOW"); expect(result.rows[0].description).toContain("Final URL: https://example.com/");
    expect(JSON.stringify(result.rows)).not.toContain("synthetic-private-value"); expect(JSON.stringify(result.rows)).not.toContain("private@example.com");
    expect(result.table?.columns.slice(-2)).toEqual([PRIVATE, PRIVATE]);
  });
  it("does not substitute a dashboard or final URL for a pending referral link", () => {
    const missing = [...partner]; missing[0] = "Pending Partner"; missing[3] = "RETRIEVE FROM DASHBOARD";
    const result = previewBulkIntake("links", [headers.join("\t"), partner.join("\t"), missing.join("\t")].join("\n"));
    expect(result.rows).toHaveLength(1); expect(result.issues).toHaveLength(1); expect(result.issues[0].line).toBe(3); expect(result.fatal).toBe(false);
  });
  it("supports Markdown tables", () => {
    const result = previewBulkIntake("links", "| Program | Category | Affiliate/referral link |\n| --- | --- | --- |\n| Example | Tools | https://example.com?ref=abc |");
    expect(result.issues).toEqual([]); expect(result.rows[0].url).toBe("https://example.com?ref=abc");
  });
  it("supports human aliases in JSON", () => {
    const result = previewBulkIntake("links", JSON.stringify([Object.fromEntries(headers.map((h, i) => [h, partner[i]]))]));
    expect(result.issues).toEqual([]); expect(result.rows[0].url).toBe(partner[3]); expect(JSON.stringify(result.rows)).not.toContain(partner[12]);
  });
  it("preserves punctuation in signed URLs and Markdown links", () => {
    const url = "https://example.com/A?ids=one,two;three&sig=x%2By#Fragment";
    expect(previewBulkIntake("links", url).rows[0]?.url).toBe(url);
    expect(previewBulkIntake("links", `[My title](${url})`).rows[0]?.url).toBe(url);
  });
  it("cannot remap recognized passwords into ordinary notes", () => {
    const result = previewBulkIntake("links", "Program\tURL\tPassword\nA\thttps://example.com\tfixture-secret", { columns: ["title", "url", "description"] });
    expect(JSON.stringify(result.rows)).not.toContain("fixture-secret");
  });
  it("finds the fourth URL column and requires review", () => {
    const result = previewBulkIntake("links", "Example\tSocial Media\tReferral\thttps://example.com?ref=x");
    expect(result.rows[0]?.url).toBe("https://example.com?ref=x"); expect(result.table?.columns[3]).toBe("url"); expect(result.table?.needsReview).toBe(true);
  });
  it("blocks unsafe URL schemes and embedded credentials", () => {
    const result = previewBulkIntake("links", JSON.stringify([{ url: "javascript:alert(1)" }, { url: "https://user:password@example.com" }, { url: "https://example.com" }]));
    expect(result.rows).toHaveLength(1); expect(result.issues).toHaveLength(2);
    expect(JSON.stringify(result.issues)).not.toContain("user:password");
  });
});

describe("prompt collection boundaries", () => {
  it("recognizes twelve labeled prompts, individually categorized, with original text intact", () => {
    const raw = Array.from({ length: 12 }, (_, i) => `## Prompt ${i + 1}: ${i % 2 ? "Python debugging" : "SEO audit"}\nYou are a specialist.\n1. Read input.\n2. Explain.\n`).join("\n");
    const result = previewBulkIntake("prompts", raw);
    expect(result.issues).toEqual([]); expect(result.rows).toHaveLength(12);
    expect(result.rows[0].category).toBe("SEO & content"); expect(result.rows[1].category).toBe("Development");
    expect(result.rows.map(r => r.content).join("")).toBe(raw);
  });
  it("recognizes numbered titles without splitting nested numbered steps", () => {
    const raw = "1. **SEO audit**\nYou are an SEO analyst.\n1. Read.\n2. Explain.\n\n2. **Python review**\nAct as a code reviewer.\n1. Read code.\n2. Explain.";
    expect(previewBulkIntake("prompts", raw).rows).toHaveLength(2);
  });
  it("recognizes independent headings below a collection title", () => {
    const raw = "# My collection\n\n## SEO expert\nYou are an SEO expert.\n### Rules\nBe accurate.\n\n## Code reviewer\nAct as a reviewer.\n### Rules\nBe precise.";
    const result = previewBulkIntake("prompts", raw); expect(result.rows).toHaveLength(2); expect(result.rows.map(r => r.content).join("")).toBe(raw);
  });
  it("keeps ordinary internal headings and numbered instructions together", () => {
    const raw = "# Role\nYou are a specialist.\n## Instructions\n1. Read input.\n2. Create output.\n## Output\nWrite a summary.";
    const result = previewBulkIntake("prompts", raw); expect(result.rows).toHaveLength(1); expect(result.rows[0].content).toBe(raw);
  });
  it("ignores markers inside fenced examples", () => {
    const raw = "Prompt 1: Example\nYou are a coder.\n```text\nPrompt 2: Sample data\n---PROMPT---\n```\n\nPrompt 2: Actual second\nAct as an editor.";
    expect(previewBulkIntake("prompts", raw).rows).toHaveLength(2);
  });
  it("offers manual paragraphs and intentional single overrides", () => {
    expect(previewBulkIntake("prompts", "First paragraph\n\nSecond paragraph", { splitRule: "paragraphs" }).rows).toHaveLength(2);
    const raw = "Prompt 1: A\nDo A.\nPrompt 2: B\nDo B.";
    expect(previewBulkIntake("prompts", raw, { splitRule: "single" }).rows[0].content).toBe(raw);
    expect(splitPromptCollection("No unambiguous boundary here.").warnings[0]).toContain("Only one prompt detected");
  });
  it("reads multiline prompt CSV and JSON exports without splitting their bodies", () => {
    const raw = 'title,content,category\nOne,"You are an editor.\n\n1. Read.\n2. Explain.",Writing';
    const result = previewBulkIntake("prompts", raw); expect(result.rows).toHaveLength(1); expect(result.issues).toEqual([]);
    const roundtrip = previewBulkIntake("prompts", JSON.stringify({ prompts: result.rows }));
    expect(roundtrip.rows[0].content).toBe(result.rows[0].content); expect(roundtrip.rows[0].category).toBe("Writing");
  });
});

it("does not guess undeclared headerless extra fields into unencrypted notes", () => {
  const result = previewBulkIntake("credentials", "Tool\tService\thttps://example.com\tperson@example.com\tfixture\t\tGeneral\tPublic note\tprivate-extra-do-not-copy");
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].notes).toBe("Public note");
  expect(JSON.stringify(result.rows)).not.toContain("private-extra-do-not-copy");
  expect(result.table?.columns[8]).toBe("__ignore__");
  expect(result.table?.needsReview).toBe(true);
});
