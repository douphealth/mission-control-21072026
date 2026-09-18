import { createServerFn } from "@tanstack/react-start";

/**
 * Server-side bridge to the Google Calendar account already connected to this
 * app. Credentials never reach the browser: the page asks this function for a
 * calendar path, and the server performs the authenticated request.
 */

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar";

function credentials() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_CALENDAR_API_KEY"];
  return { lovableKey, connectionKey, ready: Boolean(lovableKey && connectionKey) };
}

export const gcalGatewayStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { ready } = credentials();
  return { available: ready };
});

type GcalRequestInput = {
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

export const gcalGatewayRequest = createServerFn({ method: "POST" })
  .inputValidator((input: GcalRequestInput) => {
    if (!input || typeof input.path !== "string" || !input.path.startsWith("/")) {
      throw new Error("A calendar path is required.");
    }
    const method = input.method ?? "GET";
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      throw new Error("Unsupported calendar request.");
    }
    return { path: input.path, method, body: input.body } as Required<
      Pick<GcalRequestInput, "path" | "method">
    > & { body?: unknown };
  })
  .handler(async ({ data }) => {
    const { lovableKey, connectionKey, ready } = credentials();
    if (!ready) {
      return { status: 503, body: "Google Calendar is not connected to this app." };
    }
    const response = await fetch(`${GATEWAY}/calendar/v3${data.path}`, {
      method: data.method,
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey as string,
        "Content-Type": "application/json",
      },
      body: data.body === undefined ? undefined : JSON.stringify(data.body),
    });
    const text = await response.text();
    if (!response.ok) {
      console.error(`Google Calendar request failed [${response.status}]: ${text.slice(0, 500)}`);
    }
    return { status: response.status, body: text };
  });
