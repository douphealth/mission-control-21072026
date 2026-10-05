import { describe, expect, it } from "vitest";
import { matchSearchConsoleProperty } from "@/lib/googleSearchConsole";

describe("Search Console property matching", () => {
  const sites = [
    { siteUrl: "sc-domain:gearuptofit.com", permissionLevel: "siteOwner" },
    { siteUrl: "https://plantastichaven.com/", permissionLevel: "siteFullUser" },
  ];

  it("prefers a domain property when it matches the website", () => {
    expect(matchSearchConsoleProperty("https://www.gearuptofit.com/", sites)).toBe(
      "sc-domain:gearuptofit.com",
    );
  });

  it("matches URL-prefix properties by hostname", () => {
    expect(matchSearchConsoleProperty("https://plantastichaven.com/blog", sites)).toBe(
      "https://plantastichaven.com/",
    );
  });

  it("returns null instead of inventing a property", () => {
    expect(matchSearchConsoleProperty("https://unknown.example/", sites)).toBeNull();
  });
});
