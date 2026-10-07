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
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: string; code?: number };
  return candidate.name === 'QuotaExceededError' || candidate.name === 'NS_ERROR_DOM_QUOTA_REACHED' || candidate.code === 22 || candidate.code === 1014;
}
function resolveStorage(provider?: StorageProvider): StringStorage | undefined {
  try { return provider?.(); } catch { return undefined; }
}
function removeQuietly(storage: StringStorage | undefined, name: string) {
  try { storage?.removeItem(name); } catch { /* Restricted browser storage. */ }
}
/** Best-effort UI preferences ONLY. Never use for sync journals or account identity. */
export function createResilientStorage({ primary, fallback, maxValueLength = 16_384 }: ResilientStorageOptions): StringStorage & { invalidate: (name: string | null) => void } {
  const memory = new Map<string, string | null>();
  const read = (storage: StringStorage | undefined, name: string): string | null => {
    try {
      const value = storage?.getItem(name) ?? null;
      if (value !== null && value.length > maxValueLength) { removeQuietly(storage, name); return null; }
      return value;
    } catch { return null; }
  };
  return {
    getItem(name) {
      // A failed write must not be shadowed by an older value still on disk.
      if (memory.has(name)) return memory.get(name) ?? null;
      const session = read(resolveStorage(fallback), name);
      return session ?? read(resolveStorage(primary), name);
    },
    setItem(name, value) {
      const disk = resolveStorage(primary), session = resolveStorage(fallback);
      memory.set(name, value);
      if (value.length > maxValueLength) return;
      try {
        if (disk) {
          disk.setItem(name, value);
          removeQuietly(session, name);
          memory.delete(name);
          return;
        }
      } catch { /* Preserve the old disk value until a new value is safely stored. */ }
      try { session?.setItem(name, value); } catch { /* The latest value stays in memory. */ }
    },
    removeItem(name) {
      // Retain a tombstone if a restricted backend refuses removal.
      memory.set(name, null);
      removeQuietly(resolveStorage(primary), name);
      removeQuietly(resolveStorage(fallback), name);
    },
    invalidate(name) {
      if (name === null) memory.clear();
      else { memory.delete(name); removeQuietly(resolveStorage(fallback), name); }
    },
  };
}
const browserStorage = createResilientStorage({
  primary: () => window.localStorage,
  fallback: () => window.sessionStorage,
});
// SSR requests must not share an in-memory user preference cache.
export const resilientWebStorage: StringStorage = {
  getItem: name => typeof window === 'undefined' ? null : browserStorage.getItem(name),
  setItem: (name, value) => { if (typeof window !== 'undefined') browserStorage.setItem(name, value); },
  removeItem: name => { if (typeof window !== 'undefined') browserStorage.removeItem(name); },
};
if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === null || /^mc-(navigation|plan|a11y|review|theme)/.test(event.key)) browserStorage.invalidate(event.key);
  });
}
