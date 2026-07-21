import { createFileRoute } from "@tanstack/react-router";

import App from "../App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mission Control" },
      { name: "description", content: "Mission Control dashboard" },
      { property: "og:title", content: "Mission Control" },
      { property: "og:description", content: "Mission Control dashboard" },
    ],
  }),
  component: Index,
});

function Index() {
  return <App />;
}
