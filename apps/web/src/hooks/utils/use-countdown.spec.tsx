// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "./use-countdown";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const at = (msFromNow: number) =>
  new Date(Date.now() + msFromNow).toISOString();

describe("useCountdown", () => {
  it("reports the total remaining minutes past a full hour", () => {
    const target = at(65 * 60 * 1000 + 30 * 1000);
    const { result } = renderHook(() => useCountdown(target));

    expect(result.current).toEqual({
      minutes: 65,
      seconds: 30,
      isExpired: false,
    });
  });

  it("counts down on the shared second clock and expires at the target", () => {
    const target = at(2000);
    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.seconds).toBe(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toEqual({
      minutes: 0,
      seconds: 1,
      isExpired: false,
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.isExpired).toBe(true);
  });
});
