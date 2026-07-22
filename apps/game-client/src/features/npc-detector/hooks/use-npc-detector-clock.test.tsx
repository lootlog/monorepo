import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNpcDetectorClock } from "./use-npc-detector-clock";

describe("useNpcDetectorClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shares one 250 ms interval between active rows", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const first = renderHook(() => useNpcDetectorClock(true));
    const second = renderHook(() => useNpcDetectorClock(true));

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(first.result.current).toBe(Date.now());
    expect(second.result.current).toBe(Date.now());

    first.unmount();
    expect(vi.getTimerCount()).toBe(1);

    second.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not start the clock for an inactive row", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const clock = renderHook(() => useNpcDetectorClock(false));

    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    clock.unmount();
  });
});
