import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTimersUpdate } from "./use-timers-update";

describe("useTimersUpdate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("causes exactly one render per shared clock tick", () => {
    let renderCount = 0;

    renderHook(() => {
      renderCount += 1;
      useTimersUpdate();
    });

    expect(renderCount).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(renderCount).toBe(2);
  });

  it("exposes the current epoch so timer calculations depend on the clock", () => {
    const initialEpoch = new Date("2026-07-20T10:00:00.000Z").getTime();
    vi.setSystemTime(initialEpoch);

    const clock = renderHook(() => useTimersUpdate());

    expect(clock.result.current).toBe(initialEpoch);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(clock.result.current).toBe(initialEpoch + 1_000);
  });

  it("keeps one interval across rerenders and clears it on unmount", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const { rerender, unmount } = renderHook(() => useTimersUpdate());

    rerender();

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shares one interval across multiple visible timer presentations", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const firstClock = renderHook(() => useTimersUpdate());
    const secondClock = renderHook(() => useTimersUpdate());

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);

    firstClock.unmount();
    expect(vi.getTimerCount()).toBe(1);

    secondClock.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not create background work while no timer is visible", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    let renderCount = 0;

    renderHook(() => {
      renderCount += 1;
      useTimersUpdate(false);
    });

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(renderCount).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("starts and stops the clock when visibility changes", () => {
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useTimersUpdate(enabled),
      { initialProps: { enabled: false } },
    );

    expect(vi.getTimerCount()).toBe(0);

    rerender({ enabled: true });
    expect(vi.getTimerCount()).toBe(1);

    rerender({ enabled: false });
    expect(vi.getTimerCount()).toBe(0);
  });
});
