import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "@/i18n/config";

afterEach(() => {
  cleanup();
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock {
  readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

if (typeof HTMLElement.prototype.getAnimations !== "function") {
  HTMLElement.prototype.getAnimations = () => [];
}

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: vi.fn(),
});

const storageState = new Map<string, string>();

const localStorageMock = {
  clear: vi.fn(() => {
    storageState.clear();
  }),
  getItem: vi.fn((key: string) => {
    return storageState.get(key) ?? null;
  }),
  key: vi.fn((index: number) => {
    return Array.from(storageState.keys())[index] ?? null;
  }),
  removeItem: vi.fn((key: string) => {
    storageState.delete(key);
  }),
  setItem: vi.fn((key: string, value: string) => {
    storageState.set(key, value);
  }),
};

if (
  typeof window.localStorage?.getItem !== "function" ||
  typeof window.localStorage?.setItem !== "function" ||
  typeof window.localStorage?.removeItem !== "function" ||
  typeof window.localStorage?.clear !== "function"
) {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageMock,
  });
}

if (
  typeof globalThis.localStorage?.getItem !== "function" ||
  typeof globalThis.localStorage?.setItem !== "function" ||
  typeof globalThis.localStorage?.removeItem !== "function" ||
  typeof globalThis.localStorage?.clear !== "function"
) {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: localStorageMock,
  });
}
