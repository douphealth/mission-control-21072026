import { useEffect, useState } from "react";
import { ensureGoogleClientId, hasGoogleClientId } from "@/lib/googleDirectAuth";

/**
 * True once a Google identity is available for this app — either shipped with
 * the app or added by the user. Pages use it to decide whether to show the
 * one-click connect button or the one-time setup step.
 */
export function useGoogleReady(): boolean {
  const [ready, setReady] = useState(() => hasGoogleClientId());

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      // The Google account bundled with this app makes everything ready
      // without any action from the user.
      void import("@/lib/googleCalendar").then(({ refreshAppCalendarAccount }) =>
        refreshAppCalendarAccount().then((ok) => {
          if (ok && !cancelled) setReady(true);
        }),
      );
      if (hasGoogleClientId()) {
        setReady(true);
        return;
      }
      void ensureGoogleClientId().then(() => {
        if (!cancelled) setReady(hasGoogleClientId());
      });
    };
    refresh();
    window.addEventListener("mc-google-client-id-changed", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("mc-google-client-id-changed", refresh);
    };
  }, []);

  return ready;
}
