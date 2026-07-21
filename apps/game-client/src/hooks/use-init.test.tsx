import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetGameState = vi.fn();
const mockSetupProxies = vi.fn();
const mockSetGameInitCallback = vi.fn();
const mockCleanup = vi.fn();
const mockSetReady = vi.fn();
const mockGetInitializeState = vi.fn();

let capturedGameInitCallback: (() => boolean) | null = null;

vi.mock("@/store/global.store", () => ({
  useGlobalStore: (
    selector: (state: { setGameState: typeof mockSetGameState }) => unknown,
  ) =>
    selector({
      setGameState: mockSetGameState,
    }),
}));

vi.mock("@/lib/game-events-manager", () => ({
  gameEventsManager: {
    setupProxies: (...args: unknown[]) => mockSetupProxies(...args),
    setGameInitCallback: (callback: () => boolean) => {
      capturedGameInitCallback = callback;
      mockSetGameInitCallback(callback);
    },
    cleanup: (...args: unknown[]) => mockCleanup(...args),
    setReady: (...args: unknown[]) => mockSetReady(...args),
  },
}));

vi.mock("@/lib/game", () => ({
  Game: {
    getInitializeState: (...args: unknown[]) => mockGetInitializeState(...args),
  },
}));

import { useInit } from "./use-init";

describe("useInit", () => {
  beforeEach(() => {
    capturedGameInitCallback = null;
    mockSetGameState.mockReset();
    mockSetupProxies.mockReset();
    mockSetGameInitCallback.mockReset();
    mockCleanup.mockReset();
    mockSetReady.mockReset();
    mockGetInitializeState.mockReset();
  });

  it("registers proxies and cleans them up on unmount", () => {
    const { unmount } = renderHook(() => useInit());

    expect(mockSetupProxies).toHaveBeenCalledTimes(1);
    expect(mockSetGameInitCallback).toHaveBeenCalledTimes(1);

    unmount();

    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });

  it("does not initialize the game before the client is ready", () => {
    mockGetInitializeState.mockReturnValue(false);
    renderHook(() => useInit());

    expect(capturedGameInitCallback).not.toBeNull();
    expect(capturedGameInitCallback?.()).toBe(false);
    expect(mockSetGameState).not.toHaveBeenCalled();
    expect(mockSetReady).not.toHaveBeenCalled();
  });

  it("initializes the game only once", () => {
    mockGetInitializeState.mockReturnValue(true);
    renderHook(() => useInit());

    expect(capturedGameInitCallback).not.toBeNull();
    expect(capturedGameInitCallback?.()).toBe(true);
    expect(capturedGameInitCallback?.()).toBe(false);
    expect(mockSetGameState).toHaveBeenCalledTimes(1);
    expect(mockSetGameState).toHaveBeenCalledWith({
      gameInitialized: true,
    });
    expect(mockSetReady).toHaveBeenCalledTimes(1);
    expect(mockSetReady).toHaveBeenCalledWith(true);
  });
});
