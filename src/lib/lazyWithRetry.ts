import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "mc-chunk-reload-at";

function isChunkLoadError(error: unknown): boolean {
  const message = String((error as Error)?.message ?? error ?? "");
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /ChunkLoadError/i.test(message)
  );
}

/**
 * React.lazy with resilience against stale build chunks after a new deploy.
 * Retries once with a cache-busting reload of the page (at most once per minute).
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (!isChunkLoadError(error)) throw error;

      // Second attempt: the network may have blipped, or the new manifest is live.
      try {
        return await factory();
      } catch (retryError) {
        if (!isChunkLoadError(retryError)) throw retryError;

        if (typeof window !== "undefined") {
          const last = Number(window.sessionStorage.getItem(RELOAD_KEY) ?? "0");
          if (Date.now() - last > 60_000) {
            window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
            window.location.reload();
            // Keep the promise pending while the page reloads.
            return await new Promise<{ default: T }>(() => {});
          }
        }
        throw retryError;
      }
    }
  });
}
