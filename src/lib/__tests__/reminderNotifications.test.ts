import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Reminder } from "../db";

const state = vi.hoisted(() => ({
  reminders: new Map<string, Reminder>(),
  queue: Promise.resolve() as Promise<unknown>,
  toast: vi.fn(),
  markDirty: vi.fn(),
  push: vi.fn(),
  navigate: vi.fn(),
  readTasks: vi.fn(async () => []),
}));
vi.mock("@/lib/db", () => ({
  db: {
    tasks: { toArray: state.readTasks },
    reminders: {
      toArray: async () => [...state.reminders.values()].map((row) => structuredClone(row)),
      get: async (id: string) => {
        const row = state.reminders.get(id);
        return row ? structuredClone(row) : undefined;
      },
      update: async (id: string, patch: Partial<Reminder>) => {
        const row = state.reminders.get(id);
        if (!row) return 0;
        state.reminders.set(id, { ...row, ...patch });
        return 1;
      },
    },
    transaction: (...args: unknown[]) => {
      const action = args.at(-1) as () => Promise<unknown>;
      const current = state.queue.then(action);
      state.queue = current.catch(() => undefined);
      return current;
    },
  },
}));
vi.mock("sonner", () => ({ toast: { info: state.toast } }));
vi.mock("@/lib/cloudSync", () => ({
  markCloudRecordDirty: state.markDirty,
  queueCloudPush: state.push,
}));
vi.mock("@/stores/navigationStore", () => ({
  useNavigationStore: { getState: () => ({ setActiveSection: state.navigate }) },
}));

import { claimDueReminder, shouldNotifyReminder } from "../reminderNotifications";
import { notifyDueReminders, startNotificationLoop, stopNotificationLoop } from "../notifications";

const NOW = Date.parse("2026-11-03T16:30:00Z");
const reminder = (patch: Partial<Reminder> = {}): Reminder => ({
  id: "r",
  title: "Check the release",
  notes: "Review the saved evidence",
  remindAt: new Date(NOW).toISOString(),
  status: "pending",
  recurrence: "weekly",
  createdAt: "2026-11-01T12:00:00Z",
  ...patch,
});
beforeEach(() => {
  state.reminders.clear();
  state.queue = Promise.resolve();
  state.toast.mockClear();
  state.markDirty.mockClear();
  state.push.mockClear();
  state.navigate.mockClear();
  state.readTasks.mockClear();
});
afterEach(() => {
  stopNotificationLoop();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("App-open standalone reminder delivery", () => {
  it("defers a background-opened app until the first foreground visibility change", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const page = Object.assign(new EventTarget(), { hidden: true });
    vi.stubGlobal("document", page);
    state.reminders.set("r", reminder());

    startNotificationLoop();
    expect(await notifyDueReminders(NOW)).toBe(0);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(state.reminders.get("r")?.notifiedFor).toBeUndefined();
    expect(state.toast).not.toHaveBeenCalled();
    expect(state.readTasks).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    page.hidden = false;
    page.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(state.toast).toHaveBeenCalledTimes(1);
    expect(state.reminders.get("r")?.notifiedFor).toBe(reminder().remindAt);
    expect(state.readTasks).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);

    page.hidden = true;
    page.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(state.readTasks).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    page.hidden = false;
    page.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(state.readTasks).toHaveBeenCalledTimes(2);
    expect(state.toast).toHaveBeenCalledTimes(1);
  });
  it("does not claim an occurrence if the page becomes hidden while its transaction is queued", async () => {
    const page = { hidden: false };
    vi.stubGlobal("document", page);
    state.reminders.set("r", reminder());
    let releaseTransaction!: () => void;
    state.queue = new Promise<void>((resolve) => {
      releaseTransaction = resolve;
    });

    const notification = notifyDueReminders(NOW);
    await Promise.resolve();
    page.hidden = true;
    releaseTransaction();
    expect(await notification).toBe(0);
    expect(state.reminders.get("r")?.notifiedFor).toBeUndefined();
    expect(state.toast).not.toHaveBeenCalled();

    page.hidden = false;
    expect(await notifyDueReminders(NOW)).toBe(1);
  });
  it("claims one saved occurrence across concurrent checker calls without completing it", async () => {
    const row = reminder();
    state.reminders.set(row.id, row);
    const results = await Promise.all([notifyDueReminders(NOW), notifyDueReminders(NOW)]);
    expect(results.sort()).toEqual([0, 1]);
    expect(state.toast).toHaveBeenCalledTimes(1);
    expect(state.reminders.get(row.id)).toEqual({ ...row, notifiedFor: row.remindAt });
    expect(state.markDirty).toHaveBeenCalledWith("reminders", row.id);
    const action = state.toast.mock.calls[0][1].action;
    action.onClick();
    expect(state.navigate).toHaveBeenCalledWith("reminders");
  });
  it("does not repeat on title edits or equivalent timestamp spellings, then alerts a snoozed occurrence", async () => {
    state.reminders.set("r", reminder());
    await notifyDueReminders(NOW);
    state.reminders.set("r", {
      ...state.reminders.get("r")!,
      title: "Changed context",
      remindAt: "2026-11-03T18:30:00+02:00",
    });
    expect(await notifyDueReminders(NOW + 1)).toBe(0);
    state.reminders.set("r", {
      ...state.reminders.get("r")!,
      remindAt: new Date(NOW + 3_600_000).toISOString(),
      status: "snoozed",
    });
    expect(await notifyDueReminders(NOW + 3_599_999)).toBe(0);
    expect(await notifyDueReminders(NOW + 3_600_000)).toBe(1);
    expect(state.reminders.get("r")?.status).toBe("snoozed");
    expect(state.toast).toHaveBeenCalledTimes(2);
  });
  it("rechecks persisted state inside the transaction and ignores invalid, future or completed records", async () => {
    state.reminders.set("r", reminder({ status: "done" }));
    expect(await claimDueReminder("r", NOW)).toBeNull();
    expect(await claimDueReminder("missing", NOW)).toBeNull();
    expect(shouldNotifyReminder(reminder({ remindAt: "bad" }), NOW)).toBe(false);
    expect(shouldNotifyReminder(reminder(), NOW - 1)).toBe(false);
    expect(shouldNotifyReminder(reminder(), NaN)).toBe(false);
    expect(state.toast).not.toHaveBeenCalled();
  });
  it("never requests notification permission and shows browser notices only with an existing grant", async () => {
    const requestPermission = vi.fn();
    const created: unknown[] = [];
    class TestNotification {
      static permission = "default";
      static requestPermission = requestPermission;
      onclick: (() => void) | null = null;
      close() {}
      constructor(title: string, options: unknown) {
        created.push({ title, options });
      }
    }
    vi.stubGlobal("Notification", TestNotification);
    vi.stubGlobal("window", { Notification: TestNotification, focus: vi.fn() });
    state.reminders.set("r", reminder());
    await notifyDueReminders(NOW);
    expect(created).toHaveLength(0);
    TestNotification.permission = "granted";
    state.reminders.set("r2", reminder({ id: "r2" }));
    await notifyDueReminders(NOW);
    expect(created).toHaveLength(1);
    expect(requestPermission).not.toHaveBeenCalled();
    expect(state.toast).toHaveBeenCalledTimes(2);
  });
});
