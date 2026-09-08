import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "@/i18n/config";

afterEach(() => {
  cleanup();
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
