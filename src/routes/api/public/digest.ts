import { createFileRoute } from "@tanstack/react-router";

/**
 * Standalone builds do not upload local records to a server, so a server-side
 * digest cannot access them. Daily reminders run locally in the browser and
 * the briefing can be opened in the user's mail app from the dashboard.
 */
function unavailable() {
  return Response.json(
    {
      ok: false,
      standalone: true,
      error: "Server email is disabled. Use the local daily briefing or export it to your mail app.",
    },
    { status: 410 },
  );
}

export const Route = createFileRoute("/api/public/digest")({
  server: {
    handlers: {
      GET: unavailable,
      POST: unavailable,
    },
  },
});
