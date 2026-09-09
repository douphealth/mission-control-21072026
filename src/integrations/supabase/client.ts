// Supabase browser client for Mission Control.
//
// Resolution order for URL / publishable key:
//   1. Build-time env (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY) —
//      what Lovable injects when the project is connected to Supabase.
//   2. Runtime env (process.env.SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY) —
//      SSR / Cloudflare Pages / custom deployments.
//   3. Built-in default project — the account's own Supabase project. The
//      publishable key is client-safe by design (it is what ships to every
//      browser anyway); it only identifies the project, and all data access
//      is gated by RLS + user auth, never by this key.
//
// This file must NEVER throw at import time: a missing env var is a normal
// state on mirrors and local builds, not a crash. Consumers get a working
// client and the server enforces RLS. (Historical bug: the generated client
// threw "Missing Supabase environment variable(s)" and killed cloud backup
// on every deployment that did not inject the env vars.)
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { brokeredPreviewStorage } from "./previewAuthStorage";

// Publishable (anon) key of the Mission Control Supabase project.
// Client-safe: it ships to browsers in the JS bundle by definition.
const DEFAULT_SUPABASE_URL = "https://qmhuzbumfqjgpbeqdcjp.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaHV6YnVtZnFqZ3BiZXFkY2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0ODU5MjYsImV4cCI6MTg3MTMwMTkyNn0.qAhBNb4qXGfnH0U1M3FhU_TKPLBMKqmcbgt5vLzE";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function resolveConfig(): { url: string; publishableKey: string; source: "env" | "default" } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const envKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (envUrl && envKey) return { url: envUrl, publishableKey: envKey, source: "env" };
  return {
    url: DEFAULT_SUPABASE_URL,
    publishableKey: DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    source: "default",
  };
}

function createSupabaseClient() {
  const { url, publishableKey } = resolveConfig();
  return createClient<Database>(url, publishableKey, {
    global: {
      fetch: createSupabaseFetch(publishableKey),
    },
    auth: {
      storage: brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});

/** How the active client was configured — used by diagnostics surfaces. */
export function getSupabaseConfigSource(): "env" | "default" {
  return resolveConfig().source;
}
