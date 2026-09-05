export function reportLovableError(error: unknown, context?: Record<string, unknown>) {
  if (context) {
    console.error("Lovable runtime error", context, error);
    return;
  }
  console.error("Lovable runtime error", error);
}
