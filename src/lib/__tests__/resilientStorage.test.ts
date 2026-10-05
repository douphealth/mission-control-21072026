import { describe, expect, it } from "vitest";
import {
  createResilientStorage,
  isStorageQuotaError,
  type StringStorage,
} from "@/lib/resilientStorage";

class MemoryStorage implements StringStorage {
  private values = new Map<string, string>();

  getItem(name: string) {
    return this.values.get(name) ?? null;
  }

  setItem(name: string, value: string) {
    this.values.set(name, value);
  }

  removeItem(name: string) {
    this.values.delete(name);
  }
}

class QuotaStorage extends MemoryStorage {
  override setItem() {
    const error = new Error("quota");
    error.name = "QuotaExceededError";
    throw error;
  }
}

describe("resilientStorage", () => {
  it("recognizes browser quota errors", () => {
    const error = new Error("full");
    error.name = "QuotaExceededError";
    expect(isStorageQuotaError(error)).toBe(true);
  });

  it("falls back to session-like storage when primary storage is full", () => {
    const primary = new QuotaStorage();
    const fallback = new MemoryStorage();
    const storage = createResilientStorage({
      primary: () => primary,
      fallback: () => fallback,
    });

    expect(() => storage.setItem("mc-navigation-v1", "small")).not.toThrow();
    expect(storage.getItem("mc-navigation-v1")).toBe("small");
    expect(fallback.getItem("mc-navigation-v1")).toBe("small");
  });

  it("continues in memory when every browser storage backend rejects writes", () => {
    const storage = createResilientStorage({
      primary: () => new QuotaStorage(),
      fallback: () => new QuotaStorage(),
    });

    expect(() => storage.setItem("mc-navigation-v1", "dashboard")).not.toThrow();
    expect(storage.getItem("mc-navigation-v1")).toBe("dashboard");
  });

  it("drops an oversized stale payload instead of hydrating it", () => {
    const primary = new MemoryStorage();
    primary.setItem("mc-navigation-v1", "x".repeat(64));
    const storage = createResilientStorage({
      primary: () => primary,
      maxValueLength: 16,
    });

    expect(storage.getItem("mc-navigation-v1")).toBeNull();
    expect(primary.getItem("mc-navigation-v1")).toBeNull();
  });
});
