import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { cleanStores } from "nanostores";
import { afterAll, afterEach, vi } from "vitest";
import "@/i18n/config";

afterEach(() => {
  cleanup();
});

// nanostores unmounts the better-auth session atom one second after its last
// listener leaves, and that cleanup touches `window`. Unmount it synchronously
// while the DOM environment still exists so the delayed timer has nothing to do.
// The client is imported lazily so test files keep control over when the
// platform modules load and how they are mocked.
afterAll(async () => {
  const { authClient } = await import("@/lib/auth-client");
  const session = authClient.$store?.atoms?.session;
  if (session) cleanStores(session);
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn<Window["matchMedia"]>().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn<MediaQueryList["addListener"]>(),
    removeListener: vi.fn<MediaQueryList["removeListener"]>(),
    addEventListener: vi.fn<MediaQueryList["addEventListener"]>(),
    removeEventListener: vi.fn<MediaQueryList["removeEventListener"]>(),
    dispatchEvent: vi
      .fn<MediaQueryList["dispatchEvent"]>()
      .mockReturnValue(true),
  })),
});

class ResizeObserverMock implements ResizeObserver {
  readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe = vi.fn<ResizeObserver["observe"]>();
  unobserve = vi.fn<ResizeObserver["unobserve"]>();
  disconnect = vi.fn<ResizeObserver["disconnect"]>();
}

global.ResizeObserver = ResizeObserverMock;

if (typeof HTMLElement.prototype.getAnimations === "undefined") {
  HTMLElement.prototype.getAnimations = () => [];
}

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: vi.fn<Window["scrollTo"]>(),
});

const storageState = new Map<string, string>();

const localStorageMock: Storage = {
  get length() {
    return storageState.size;
  },
  clear: vi.fn<() => void>(() => {
    storageState.clear();
  }),
  getItem: vi.fn<Storage["getItem"]>((key: string) => {
    return storageState.get(key) ?? null;
  }),
  key: vi.fn<Storage["key"]>((index: number) => {
    return Array.from(storageState.keys())[index] ?? null;
  }),
  removeItem: vi.fn<(key: string) => void>((key: string) => {
    storageState.delete(key);
  }),
  setItem: vi.fn<(key: string, value: string) => void>(
    (key: string, value: string) => {
      storageState.set(key, value);
    },
  ),
};

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: localStorageMock,
});

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: localStorageMock,
});

afterEach(() => {
  localStorageMock.clear();
});
