import { useEffect, useState } from "react";
import { intelligenceCapabilities } from "@/lib/controlCenter.functions";

type Capabilities = Awaited<ReturnType<typeof intelligenceCapabilities>>;
let cached: { value: Capabilities; at: number } | null = null;
let pending: Promise<Capabilities> | null = null;

function getCapabilities(refresh = false) {
  if (!refresh && cached && Date.now() - cached.at < 120_000) return Promise.resolve(cached.value);
  if (!pending) {
    pending = intelligenceCapabilities().then(value => {
      // Authentication failures must be rechecked after signing in.
      if (value.status === "ok") cached = { value, at: Date.now() };
      else cached = null;
      return value;
    }).finally(() => { pending = null; });
  }
  return pending;
}

export function useIntelligenceCapabilities() {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let live = true;
    void getCapabilities().then(value => { if (live) setCapabilities(value); })
      .catch(() => { if (live) setError("Connection status could not be read from this deployment. Retry after confirming that its sign-in session is active."); })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, []);
  async function refresh() {
    setBusy(true); setError("");
    try { setCapabilities(await getCapabilities(true)); }
    catch { setCapabilities(null); setError("Connection status could not be read from this deployment. Retry after confirming that its sign-in session is active."); }
    finally { setBusy(false); }
  }
  return { capabilities, error, busy, refresh };
}
