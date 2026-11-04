import { beforeEach, describe, expect, it } from "vitest";
import { FOCUS_REQUEST_TTL_MS, useConsoleFocus } from "@/stores/consoleFocusStore";
import { useNavigationStore } from "@/stores/navigationStore";

describe("console focus hand-off", () => {
  beforeEach(() => {
    useConsoleFocus.setState({ request: null });
  });

  it("switches workspace and delivers the key exactly once to the target console", () => {
    useConsoleFocus.getState().open("cloudflare", "abcd:pages:site");
    expect(useNavigationStore.getState().activeSection).toBe("cloudflare");
    expect(useConsoleFocus.getState().consume("cloudflare")).toBe("abcd:pages:site");
    expect(useConsoleFocus.getState().consume("cloudflare")).toBeNull();
  });

  it("does not hand a request to the wrong console", () => {
    useConsoleFocus.getState().open("github", "douphealth/alpha");
    expect(useConsoleFocus.getState().consume("cloudflare")).toBeNull();
    expect(useConsoleFocus.getState().consume("github")).toBe("douphealth/alpha");
  });

  it("drops a request nobody picked up in time instead of firing it later", () => {
    useConsoleFocus.getState().open("github", "douphealth/alpha");
    const at = useConsoleFocus.getState().request!.at;
    expect(useConsoleFocus.getState().consume("github", at + FOCUS_REQUEST_TTL_MS + 1)).toBeNull();
    expect(useConsoleFocus.getState().request).toBeNull();
  });
});
