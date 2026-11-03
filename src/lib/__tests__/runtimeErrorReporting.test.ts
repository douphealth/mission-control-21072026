import { afterEach, describe, expect, it, vi } from "vitest";
import { installRuntimeErrorHandlers } from "@/lib/runtimeErrorReporting";

afterEach(() => vi.restoreAllMocks());

describe("workspace error reporting", () => {
  it("keeps the workspace available when an optional async operation rejects", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const target = new EventTarget();
    const fatal = vi.fn();
    const recoverable = vi.fn();
    const cleanup = installRuntimeErrorHandlers(target as unknown as Window, { fatal, recoverable });
    const event = Object.assign(new Event("unhandledrejection"), { reason: new Error("Export storage unavailable") });

    target.dispatchEvent(event);

    expect(recoverable).toHaveBeenCalledWith("Export storage unavailable");
    expect(fatal).not.toHaveBeenCalled();
    cleanup();
  });

  it("preserves fatal diagnostics for uncaught application errors", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const target = new EventTarget();
    const fatal = vi.fn();
    const recoverable = vi.fn();
    const cleanup = installRuntimeErrorHandlers(target as unknown as Window, { fatal, recoverable });
    const error = new Error("Workspace render crashed");

    target.dispatchEvent(Object.assign(new Event("error"), { message: error.message, error }));

    expect(fatal).toHaveBeenCalledWith(error.message, error.stack);
    expect(recoverable).not.toHaveBeenCalled();
    cleanup();
  });

  it("cleans up listeners and safely describes rejection values without a message", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const target = new EventTarget();
    const fatal = vi.fn();
    const recoverable = vi.fn();
    const cleanup = installRuntimeErrorHandlers(target as unknown as Window, { fatal, recoverable });
    const event = Object.assign(new Event("unhandledrejection"), { reason: { status: 503 } });

    target.dispatchEvent(event);
    expect(recoverable).toHaveBeenCalledWith("An operation could not finish. Please retry it.");
    cleanup();
    target.dispatchEvent(event);
    target.dispatchEvent(Object.assign(new Event("error"), { message: "After unmount" }));
    expect(recoverable).toHaveBeenCalledTimes(1);
    expect(fatal).not.toHaveBeenCalled();
  });
});
