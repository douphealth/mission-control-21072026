/** Browser-side owner passcode, sent with every server call as x-mc-owner-passcode. */
export const OWNER_PASSCODE_KEY = "mc-owner-passcode";
export const OWNER_PASSCODE_HEADER = "x-mc-owner-passcode";

export function readOwnerPasscode(): string {
  if (typeof window === "undefined") return "";
  try { return window.localStorage.getItem(OWNER_PASSCODE_KEY) || ""; } catch { return ""; }
}
export function saveOwnerPasscode(value: string) {
  try {
    if (value) window.localStorage.setItem(OWNER_PASSCODE_KEY, value);
    else window.localStorage.removeItem(OWNER_PASSCODE_KEY);
  } catch { /* storage unavailable */ }
}
