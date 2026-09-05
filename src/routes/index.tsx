import { createFileRoute } from "@tanstack/react-router";

import App from "../App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mission Control" },
      {
        name: "description",
        content:
          "Mission Control personal dashboard for tasks, calendars, imports, credentials, and daily work.",
      },
      { property: "og:title", content: "Mission Control" },
      {
        property: "og:description",
        content:
          "Mission Control personal dashboard for tasks, calendars, imports, credentials, and daily work.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <App />;
}
