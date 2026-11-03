interface RuntimeErrorReporters {
  fatal: (message: string, stack?: string) => void;
  recoverable: (message: string) => void;
}

function errorMessage(value: unknown, fallback: string): string {
  if (value instanceof Error) return value.message || fallback;
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && "message" in value && typeof value.message === "string") {
    return value.message || fallback;
  }
  return fallback;
}

/** An optional async operation failing must not cover the usable workspace with a fatal overlay. */
export function installRuntimeErrorHandlers(
  target: Pick<Window, "addEventListener" | "removeEventListener">,
  reporters: RuntimeErrorReporters,
): () => void {
  const onError = (event: ErrorEvent) => {
    console.error("Fatal client error:", event.error ?? event.message);
    reporters.fatal(event.message || "An unexpected application error occurred.", event.error?.stack);
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    console.error("Async operation failed:", event.reason);
    reporters.recoverable(errorMessage(event.reason, "An operation could not finish. Please retry it."));
  };

  target.addEventListener("error", onError);
  target.addEventListener("unhandledrejection", onRejection);
  return () => {
    target.removeEventListener("error", onError);
    target.removeEventListener("unhandledrejection", onRejection);
  };
}
