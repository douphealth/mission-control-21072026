export interface StringStorage {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
}

type StorageProvider = () => StringStorage | undefined;

interface ResilientStorageOptions {
  primary: StorageProvider;
  fallback?: StorageProvider;
  maxValueLength?: number;
}

export function isStorageQuotaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; code?: number };
  return (
    candidate.name === "QuotaExceededError" ||
    candidate.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    candidate.code === 22 ||
    candidate.code === 1014
  );
}

function resolveStorage(provider?: StorageProvider): StringStorage | undefined {
  if (!provider) return undefined;
  try {
    return provider();
  } catch {
    return undefined;
  }
}

function removeQuietly(storage: StringStorage | undefined, name: string) {
  if (!storage) return;
  try {
    storage.removeItem(name);
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

/**
 * Synchronous web storage that never lets browser storage failures crash the app.
 *
 * Writes prefer localStorage, retry after clearing only the current key on quota
 * errors, then fall back to sessionStorage and finally in-memory state.
 * Oversized values are intentionally kept in memory only so a corrupt/stale
 * persisted payload cannot fill the origin again.
 */
export function createResilientStorage({
  primary,
  fallback,
  maxValueLength = 16_384,
}: ResilientStorageOptions): StringStorage {
  const memory = new Map<string, string>();

  const read = (storage: StringStorage | undefined, name: string): string | null => {
    if (!storage) return null;
    try {
      const value = storage.getItem(name);
      if (value !== null && value.length > maxValueLength) {
        removeQuietly(storage, name);
        return null;
      }
      return value;
    } catch {
      return null;
    }
  };

  return {
    getItem(name) {
      const primaryStorage = resolveStorage(primary);
      const primaryValue = read(primaryStorage, name);
      if (primaryValue !== null) return primaryValue;

      const fallbackStorage = resolveStorage(fallback);
      const fallbackValue = read(fallbackStorage, name);
      if (fallbackValue !== null) return fallbackValue;

      return memory.get(name) ?? null;
    },

    setItem(name, value) {
      memory.set(name, value);

      const primaryStorage = resolveStorage(primary);
      const fallbackStorage = resolveStorage(fallback);

      if (value.length > maxValueLength) {
        removeQuietly(primaryStorage, name);
        removeQuietly(fallbackStorage, name);
        return;
      }

      if (primaryStorage) {
        try {
          primaryStorage.setItem(name, value);
          removeQuietly(fallbackStorage, name);
          return;
        } catch (error) {
          // A stale/corrupt copy of this key may itself be consuming the quota.
          if (isStorageQuotaError(error)) {
            removeQuietly(primaryStorage, name);
            try {
              primaryStorage.setItem(name, value);
              removeQuietly(fallbackStorage, name);
              return;
            } catch {
              // Continue to the fallback below.
            }
          }
        }
      }

      if (fallbackStorage) {
        try {
          fallbackStorage.setItem(name, value);
        } catch {
          // In-memory state already contains the value; never crash the UI.
        }
      }
    },

    removeItem(name) {
      memory.delete(name);
      removeQuietly(resolveStorage(primary), name);
      removeQuietly(resolveStorage(fallback), name);
    },
  };
}

export const resilientWebStorage = createResilientStorage({
  primary: () => (typeof window === "undefined" ? undefined : window.localStorage),
  fallback: () => (typeof window === "undefined" ? undefined : window.sessionStorage),
});
