// Shared helpers for unit tests. Run all tests with:  node --test
//
// SAFETY: never write a literal mobile number in this repo, not even in tests.
// sampleMobile() builds an obviously fake one at runtime instead.

/** A fake 10-digit mobile: first digit + nine copies of `fill`, e.g. "9" + "000000000". */
export function sampleMobile(first = "9", fill = "0") {
  return String(first) + String(fill).repeat(9);
}

/** Minimal in-memory stand-in for window.localStorage. */
export class FakeStorage {
  constructor() { this.map = new Map(); }
  get length() { return this.map.size; }
  key(i) { return [...this.map.keys()][i] ?? null; }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

/** Install a fresh FakeStorage as globalThis.localStorage and return it. */
export function useFakeStorage() {
  const fake = new FakeStorage();
  Object.defineProperty(globalThis, "localStorage", { value: fake, configurable: true, writable: true });
  return fake;
}

/** Make every localStorage call throw, to prove the app survives blocked storage. */
export function useBrokenStorage() {
  const broken = new Proxy({}, { get() { throw new Error("storage blocked"); } });
  Object.defineProperty(globalThis, "localStorage", { value: broken, configurable: true, writable: true });
}
