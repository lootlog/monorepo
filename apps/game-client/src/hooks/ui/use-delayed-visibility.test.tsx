import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDelayedVisibility } from "./use-delayed-visibility";

describe("useDelayedVisibility", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reveals an active state only after the configured delay", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDelayedVisibility(true, 200));

    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(199));
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it("cancels the pending reveal when the state becomes inactive", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ active }) => useDelayedVisibility(active, 200),
      { initialProps: { active: true } },
    );

    rerender({ active: false });
    act(() => vi.advanceTimersByTime(200));

    expect(result.current).toBe(false);
  });
});
