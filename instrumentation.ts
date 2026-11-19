/**
 * instrumentation.ts
 *
 * Runs once when the Next.js server starts (before any request is handled).
 * Patches a broken or missing localStorage global that some Node environments
 * inject as an incomplete stub (e.g., --localstorage-file with no valid path).
 *
 * This is a no-op in real browser contexts.
 */
export async function register() {
  if (
    typeof globalThis.localStorage === "undefined" ||
    typeof globalThis.localStorage?.getItem !== "function"
  ) {
    const store = new Map<string, string>();

    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, String(value)),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        get length() { return store.size; },
        key: (index: number) => [...store.keys()][index] ?? null,
      },
      writable: true,
      configurable: true,
    });
  }
}
