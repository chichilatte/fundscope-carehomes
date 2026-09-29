/**
 * Generic key-value storage. Kept free of app-specific types so it can be
 * reused anywhere; `repository.ts` is the app-specific layer on top.
 */
export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** Browser localStorage, safe against unavailable/private-mode access. */
export const localStorageAdapter: StorageAdapter = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Quota exceeded or storage disabled — ignore.
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore.
    }
  },
};

/** In-memory adapter, useful for tests and non-browser environments. */
export function memoryStorage(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value);
    },
    remove: (key) => {
      map.delete(key);
    },
  };
}
