import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Timer } from "@/api/timers.api";
import {
  getNextTimerRemovalBoundary,
  useTimerRemovalBoundary,
} from "./use-timer-removal-boundary";

const NOW = new Date("2026-07-20T10:00:00.000Z").getTime();

const createTimer = (overrides?: Partial<Timer>): Timer =>
  ({
    guildId: "guild-1",
    timerKey: "timer-1",
    world: "gefion",
    npcId: 10,
    minSpawnTime: new Date(NOW + 4_000).toISOString(),
    maxSpawnTime: new Date(NOW + 5_000).toISOString(),
    updatedAt: new Date(NOW).toISOString(),
    wasReset: false,
    npc: { id: 10, name: "Tanroth" },
    ...overrides,
  }) as Timer;

describe("useTimerRemovalBoundary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses deletedAt or maxSpawnTime plus the removal delay", () => {
    const timer = createTimer();
    const deletedTimer = createTimer({
      deletedAt: new Date(NOW + 2_000).toISOString(),
    });

    expect(getNextTimerRemovalBoundary([timer], 30_000, NOW)).toBe(
      NOW + 35_000,
    );
    expect(getNextTimerRemovalBoundary([deletedTimer], 30_000, NOW)).toBe(
      NOW + 32_000,
    );
  });

  it("refreshes once at the nearest boundary without a polling interval", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    let renderCount = 0;

    renderHook(() => {
      renderCount += 1;
      useTimerRemovalBoundary([createTimer()], 30_000, true);
    });

    expect(renderCount).toBe(1);
    expect(setIntervalSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(34_999);
    });
    expect(renderCount).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(renderCount).toBe(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not schedule work for an empty or closed presentation", () => {
    const empty = renderHook(() => useTimerRemovalBoundary([], 30_000, true));
    const closed = renderHook(() =>
      useTimerRemovalBoundary([createTimer()], 30_000, false),
    );

    expect(vi.getTimerCount()).toBe(0);
    empty.unmount();
    closed.unmount();
  });
});
