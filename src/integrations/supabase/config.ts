// Single source of truth for the Mission Control Supabase project identity.
//
// The publishable key below is client-safe by design — it ships inside
// every browser bundle by definition. It identifies the project; all
// data access is gated by RLS + user auth, never by this key.
//
// Resolution order (mirrors src/integrations/supabase/client.ts):
//   1. Build-time VITE_* env vars (what Lovable injects when connected)
//   2. Runtime process.env (SSR / Cloudflare Pages / custom deploys)
//   3. Built-in default — the account's own live project
//
// Server modules (auth-middleware, client.server) read process.env only;
// they never see import.meta.env, so they fall back to these constants.

export const DEFAULT_SUPABASE_URL = "https://qmhuzbumfqjgpbeqdcjp.supabase.co";

export const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHV6YnVtZnFqZ3BiZXFkY2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NDUwNzAsImV4cCI6NDYwOTE0NTA3MH0.w_npw6SoKmcbgt5vLzE";

/** Resolve URL + publishable key with env override, never throwing. */
export function resolveSupabaseConfig(): {
  url: string;
  publishableKey: string;
  source: "env" | "default";
} {
  const envUrl = process.env.SUPABASE_URL;
  const envKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (envUrl && envKey) return { url: envUrl, publishableKey: envKey, source: "env" };
  return {
    url: DEFAULT_SUPABASE_URL,
    publishableKey: DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    source: "default",
  };
}

/** True when the resolved project is the default (non-env) project. */
export function isDefaultSupabaseProject(url: string): boolean {
  return url === DEFAULT_SUPABASE_URL;
}
