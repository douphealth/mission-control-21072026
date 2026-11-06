import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { OWNER_PASSCODE_HEADER, readOwnerPasscode } from "./lib/ownerPasscode";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

/** Attach the owner passcode (if unlocked on this device) to every server call. */
const ownerPasscodeMiddleware = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const passcode = readOwnerPasscode();
  return next(passcode ? { headers: { [OWNER_PASSCODE_HEADER]: passcode } } : {});
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
  functionMiddleware: [ownerPasscodeMiddleware],
}));
