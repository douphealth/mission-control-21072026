import { createServerFn } from "@tanstack/react-start";
import { selectGoogleClientId } from "@/lib/googleClientConfig";

/**
 * Returns the app-wide Google OAuth Client ID.
 *
 * A Client ID is public configuration (it ships in every Google sign-in page
 * source), so it is safe to hand to the browser. The paired client secret is
 * never read here and never leaves the server.
 */
export const getServerGoogleClientId = createServerFn({ method: "GET" }).handler(async () => {
  const { readCloudflareRuntimeEnv } = await import("@/lib/cloudflareRuntimeEnv.server");
  const env = await readCloudflareRuntimeEnv();
  return { clientId: selectGoogleClientId(env.GOOGLE_OAUTH_CLIENT_ID, env.VITE_GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_ID) };
});
