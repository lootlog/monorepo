import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useInit } from "./use-init";
import { useGlobalStore } from "@/store/global.store";
import { gameEventsManager } from "@/lib/game-events-manager";
import { Game } from "@/lib/game";

const { mockToastWarning } = vi.hoisted(() => ({
  mockToastWarning: vi.fn(),
}));

vi.mock("@/store/global.store");
vi.mock("@/lib/game-events-manager");
vi.mock("@/lib/game");
vi.mock("sonner", () => ({
  toast: {
    warning: mockToastWarning,
  },
}));

describe("useInit", () => {
  const mockSetGameState = vi.fn();
  const mockSetupProxies = vi.fn();
  const mockSetGameInitCallback = vi.fn();
  const mockSetReady = vi.fn();
  const mockCleanup = vi.fn();
  const mockGetInitializeState = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    delete window.__lootlog_early_events;

    vi.mocked(useGlobalStore).mockReturnValue({
      setGameState: mockSetGameState,
    } as never);

    vi.mocked(gameEventsManager).setupProxies = mockSetupProxies;
    vi.mocked(gameEventsManager).setGameInitCallback = mockSetGameInitCallback;
    vi.mocked(gameEventsManager).setReady = mockSetReady;
    vi.mocked(gameEventsManager).cleanup = mockCleanup;
    vi.mocked(gameEventsManager).hadEarlyEvents = false;

    vi.mocked(Game).getInitializeState = mockGetInitializeState;
    mockGetInitializeState.mockReturnValue(false);
  });

  it("should setup game events manager on mount", () => {
    renderHook(() => useInit());

    expect(mockSetupProxies).toHaveBeenCalledTimes(1);
    expect(mockSetGameInitCallback).toHaveBeenCalledTimes(1);
  });

  it("should cleanup game events manager on unmount", () => {
    const { unmount } = renderHook(() => useInit());

    unmount();

    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });

  it("should show an update warning when early event support is unavailable", () => {
    renderHook(() => useInit());

    expect(mockToastWarning).toHaveBeenCalledTimes(1);
    expect(mockToastWarning).toHaveBeenCalledWith(
      "Wymagana aktualizacja Lootlog",
      expect.objectContaining({
        duration: Infinity,
      }),
    );
  });

  it("should not show an update warning when the early event buffer exists", () => {
    window.__lootlog_early_events = [];

    renderHook(() => useInit());

    expect(mockToastWarning).not.toHaveBeenCalled();
  });

  it("should not show an update warning after early event support was detected", () => {
    vi.mocked(gameEventsManager).hadEarlyEvents = true;

    renderHook(() => useInit());

    expect(mockToastWarning).not.toHaveBeenCalled();
  });

  describe("game initialization flow", () => {
    it("should initialize game state when game is ready", () => {
      mockGetInitializeState.mockReturnValue(true);

      renderHook(() => useInit());

      const gameInitCallback = mockSetGameInitCallback.mock.calls[0][0];
      const result = gameInitCallback();

      expect(mockSetGameState).toHaveBeenCalledWith({
        gameInitialized: true,
      });
      expect(mockSetReady).toHaveBeenCalledWith(true);
      expect(result).toBe(true);
    });

    it("should not initialize if game is not ready", () => {
      mockGetInitializeState.mockReturnValue(false);

      renderHook(() => useInit());

      const gameInitCallback = mockSetGameInitCallback.mock.calls[0][0];
      const result = gameInitCallback();

      expect(mockSetGameState).not.toHaveBeenCalled();
      expect(mockSetReady).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it("should not initialize multiple times", () => {
      mockGetInitializeState.mockReturnValue(true);

      renderHook(() => useInit());

      const gameInitCallback = mockSetGameInitCallback.mock.calls[0][0];

      const result1 = gameInitCallback();
      const result2 = gameInitCallback();

      expect(mockSetGameState).toHaveBeenCalledTimes(1);
      expect(mockSetReady).toHaveBeenCalledTimes(1);
      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it("should return false if already initialized", () => {
      renderHook(() => useInit());

      const gameInitCallback = mockSetGameInitCallback.mock.calls[0][0];

      const result = gameInitCallback();

      expect(result).toBe(false);
      expect(mockSetGameState).not.toHaveBeenCalled();
    });
  });
});
