import { createServerFn } from "@tanstack/react-start";

/**
 * Returns the app-wide Google OAuth Client ID.
 *
 * A Client ID is public configuration (it ships in every Google sign-in page
 * source), so it is safe to hand to the browser. The paired client secret is
 * never read here and never leaves the server.
 */
export const getServerGoogleClientId = createServerFn({ method: "GET" }).handler(async () => {
  const clientId = process.env["GOOGLE_OAUTH_CLIENT_ID"] || "";
  const valid = /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId.trim());
  return { clientId: valid ? clientId.trim() : "" };
});
