import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useInit } from "./use-init";
import { useGlobalStore } from "@/store/global.store";
import { gameEventsManager } from "@/lib/game-events-manager";
import { Game } from "@/lib/game";

vi.mock("@/store/global.store");
vi.mock("@/lib/game-events-manager");
vi.mock("@/lib/game");

describe("useInit", () => {
  const mockSetGameState = vi.fn();
  const mockSetupProxies = vi.fn();
  const mockSetGameInitCallback = vi.fn();
  const mockSetReady = vi.fn();
  const mockCleanup = vi.fn();
  const mockGetInitializeState = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGlobalStore).mockReturnValue({
      setGameState: mockSetGameState,
    } as never);

    vi.mocked(gameEventsManager).setupProxies = mockSetupProxies;
    vi.mocked(gameEventsManager).setGameInitCallback = mockSetGameInitCallback;
    vi.mocked(gameEventsManager).setReady = mockSetReady;
    vi.mocked(gameEventsManager).cleanup = mockCleanup;

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
