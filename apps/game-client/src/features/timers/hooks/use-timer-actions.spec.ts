import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Guild } from "@/hooks/api/use-guild";
import { useTimerActions } from "./use-timer-actions";

vi.mock("@/hooks/api/use-delete-timer", () => ({
  useDeleteTimer: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/api/use-reset-timer", () => ({
  useResetTimer: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/store/timers.store", () => ({
  useTimersStore: () => ({
    hideTimer: vi.fn(),
    pinTimer: vi.fn(),
    unpinTimer: vi.fn(),
    pinnedTimers: { guild1: [] },
    setTimerColor: vi.fn(),
  }),
}));

import { createMockTimer } from "../__tests__/test-helpers";

describe("useTimerActions", () => {
  const mockTimer = createMockTimer();

  const mockGuilds: Guild[] = [
    { id: "guild1", name: "Guild One" } as Guild,
    { id: "guild2", name: "Guild Two" } as Guild,
  ];

  const settingsKey = "guild1";
  const world = "world1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return isPinned as false when timer is not pinned", () => {
    const { result } = renderHook(() =>
      useTimerActions(mockTimer, settingsKey, world, mockGuilds),
    );

    expect(result.current.isPinned).toBe(false);
  });

  it("should provide handler functions", () => {
    const { result } = renderHook(() =>
      useTimerActions(mockTimer, settingsKey, world, mockGuilds),
    );

    expect(typeof result.current.handleHideTimer).toBe("function");
    expect(typeof result.current.handleHideTimerForAll).toBe("function");
    expect(typeof result.current.handlePinTimer).toBe("function");
    expect(typeof result.current.handlePinTimerForAll).toBe("function");
    expect(typeof result.current.handleUnpinTimerForAll).toBe("function");
    expect(typeof result.current.handleTimerColorChange).toBe("function");
    expect(typeof result.current.handleRestartTimer).toBe("function");
    expect(typeof result.current.handleDeleteTimer).toBe("function");
  });

  it("should not throw when calling handlers without settingsKey", () => {
    const { result } = renderHook(() =>
      useTimerActions(mockTimer, "", world, mockGuilds),
    );

    expect(() => {
      act(() => {
        result.current.handleHideTimer();
        result.current.handlePinTimer();
      });
    }).not.toThrow();
  });

  it("should not throw when calling handlers without world", () => {
    const { result } = renderHook(() =>
      useTimerActions(mockTimer, settingsKey, undefined, mockGuilds),
    );

    expect(() => {
      act(() => {
        result.current.handleRestartTimer();
        result.current.handleDeleteTimer();
      });
    }).not.toThrow();
  });

  it("should not throw when calling handleHideTimerForAll without guilds", () => {
    const { result } = renderHook(() =>
      useTimerActions(mockTimer, settingsKey, world, undefined),
    );

    expect(() => {
      act(() => {
        result.current.handleHideTimerForAll();
      });
    }).not.toThrow();
  });

  it("should handle color change with optional color parameter", () => {
    const { result } = renderHook(() =>
      useTimerActions(mockTimer, settingsKey, world, mockGuilds),
    );

    expect(() => {
      act(() => {
        result.current.handleTimerColorChange("red");
        result.current.handleTimerColorChange();
      });
    }).not.toThrow();
  });

  it("should handle delete with optional guildId override", () => {
    const { result } = renderHook(() =>
      useTimerActions(mockTimer, settingsKey, world, mockGuilds),
    );

    expect(() => {
      act(() => {
        result.current.handleDeleteTimer();
        result.current.handleDeleteTimer("guild2");
      });
    }).not.toThrow();
  });
});
