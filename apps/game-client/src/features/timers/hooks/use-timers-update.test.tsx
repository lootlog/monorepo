import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TimerWithTimeLeft } from "../utils/timers-utils";

const mockCalculateTimeLeft = vi.fn();
const mockFilterTimersByRemovalTime = vi.fn();

vi.mock("../utils/timers-utils", () => ({
  calculateTimeLeft: (...args: unknown[]) => mockCalculateTimeLeft(...args),
  filterTimersByRemovalTime: (...args: unknown[]) =>
    mockFilterTimersByRemovalTime(...args),
}));

import { useTimersUpdate } from "./use-timers-update";

const createTimer = (name: string): TimerWithTimeLeft =>
  ({
    id: `timer-${name}`,
    guildId: "guild-1",
    timerKey: `timer-${name}`,
    world: "pandora",
    npcId: 10,
    minSpawnTime: "2026-04-22T10:00:00.000Z",
    maxSpawnTime: "2026-04-22T10:05:00.000Z",
    updatedAt: "2026-04-22T09:59:00.000Z",
    wasReset: false,
    npc: {
      id: 10,
      name,
      lvl: 120,
      prof: "W",
      icon: "icon.gif",
      wt: 10,
      type: "hero",
      margonemType: 4,
      location: "Ruins",
    } as never,
    minTimeLeft: 60_000,
    maxTimeLeft: 120_000,
  }) as TimerWithTimeLeft;

describe("useTimersUpdate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockCalculateTimeLeft.mockReset();
    mockFilterTimersByRemovalTime.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("recalculates timers every second and filters expired entries", () => {
    const initialTimers = [createTimer("Tanroth")];
    const recalculatedTimers = [createTimer("Mushita")];
    const filteredTimers = [createTimer("Mushita")];

    mockCalculateTimeLeft.mockReturnValue(recalculatedTimers);
    mockFilterTimersByRemovalTime.mockReturnValue(filteredTimers);

    const { result } = renderHook(() => useTimersUpdate(initialTimers, 30_000));

    expect(result.current).toBe(initialTimers);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(mockCalculateTimeLeft).toHaveBeenCalledWith(initialTimers);
    expect(mockFilterTimersByRemovalTime).toHaveBeenCalledWith(
      recalculatedTimers,
      30_000,
    );
    expect(result.current).toEqual(filteredTimers);
  });

  it("synchronizes immediately when the active timers input changes", () => {
    const initialTimers = [createTimer("Tanroth")];
    const nextTimers = [createTimer("Mushita")];

    mockCalculateTimeLeft.mockReturnValue(nextTimers);
    mockFilterTimersByRemovalTime.mockReturnValue(nextTimers);

    const { result, rerender } = renderHook(
      ({ activeTimers, removeTimerAfterMs }) =>
        useTimersUpdate(activeTimers, removeTimerAfterMs),
      {
        initialProps: {
          activeTimers: initialTimers,
          removeTimerAfterMs: 30_000,
        },
      },
    );

    rerender({
      activeTimers: nextTimers,
      removeTimerAfterMs: 10_000,
    });

    expect(result.current).toBe(nextTimers);
  });

  it("clears the refresh interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const { unmount } = renderHook(() =>
      useTimersUpdate([createTimer("Tanroth")], 30_000),
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });
});
