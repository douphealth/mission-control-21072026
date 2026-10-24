import { afterEach, describe, expect, it, vi } from "vitest";
import { requireCloudflareViewer } from "@/lib/cloudflareAccess.server";

const env = {
  CLOUDFLARE_ACCESS_TEAM_DOMAIN: "test-team-identity.cloudflareaccess.com",
  CLOUDFLARE_ACCESS_AUD: "test-audience-tag",
  CLOUDFLARE_ACCESS_ALLOWED_EMAILS: "viewer@example.com",
};
const part = (data: unknown) => Buffer.from(JSON.stringify(data)).toString("base64url");

describe("Cloudflare Access RS256 JWT validation", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("accepts a valid signed audience-bound and email-allowed token, rejects tampering", async () => {
    const keys = await crypto.subtle.generateKey({
      name: "RSASSA-PKCS1-v1_5", modulusLength:2048,
      publicExponent:new Uint8Array([1,0,1]), hash:"SHA-256",
    }, true, ["sign","verify"]);
    const pub = await crypto.subtle.exportKey("jwk",keys.publicKey);
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({keys:[{...pub,kid:"synthetic-test-key",alg:"RS256",use:"sig"}]}),{status:200})));
    const header = part({alg:"RS256",typ:"JWT",kid:"synthetic-test-key"});
    const payload = part({
      iss:"https://" + env.CLOUDFLARE_ACCESS_TEAM_DOMAIN,
      aud:[env.CLOUDFLARE_ACCESS_AUD],
      exp:Math.floor(Date.now()/1000) + 300,
      email:"viewer@example.com",
    });
    const bytes = new TextEncoder().encode(header+"."+payload);
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5",keys.privateKey,bytes);
    const jwt = header+"."+payload+"."+Buffer.from(signature).toString("base64url");
    const request = new Request("https://mission.example.com",{
      headers:{"cf-access-jwt-assertion":jwt},
    });
    await expect(requireCloudflareViewer(request,env))
      .resolves.toEqual({email:"viewer@example.com"});
    const tampered = new Request("https://mission.example.com",{
      headers:{"cf-access-jwt-assertion":jwt.slice(0,-3)+"abc"},
    });
    await expect(requireCloudflareViewer(tampered,env))
      .rejects.toMatchObject({code:"unauthorized"});
  });
});
