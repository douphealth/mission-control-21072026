/** Name rules shared by the browser forms and the server delete functions. */
export const CF_NAME = /^[a-zA-Z0-9_.-]{1,160}$/;
export const GH_NAME = /^[A-Za-z0-9_.-]{1,100}$/;

/** Header carrying the browser's Google token for the server-side admin check (never in request data). */
export const ADMIN_GOOGLE_TOKEN_HEADER = "x-mc-admin-google-token";
