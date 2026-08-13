// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CoverageGap } from "../queries/use-map-coverage-timer";
import {
  type MapStatus,
  subscribeToCoverageClock,
  useLocalCoverageTimer,
} from "./use-local-coverage-timer";

const createGap = (
  id: string,
  gapType: CoverageGap["gapType"],
  startedAt: string,
): CoverageGap => ({
  id,
  mapId: "map-1",
  heroNpcId: "hero-1",
  gapType,
  startedAt,
  endedAt: null,
  durationSeconds: null,
});

describe("useLocalCoverageTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-08-12T12:10:00.000Z");
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("starts a fresh timer after coverage returns and adopts the new backend gap", () => {
    const previousGap = createGap(
      "gap-previous",
      "UNCOVERED",
      "2026-08-12T12:05:00.000Z",
    );
    const { result, rerender } = renderHook(
      ({ status, activeGap }: { status: MapStatus; activeGap: CoverageGap }) =>
        useLocalCoverageTimer(status, activeGap),
      {
        initialProps: {
          status: "ASSIGNED_ABSENT" as MapStatus,
          activeGap: previousGap,
        },
      },
    );

    expect(result.current.formattedDuration).toBe("00:05:00");

    rerender({ status: "ASSIGNED_PRESENT", activeGap: previousGap });
    expect(result.current.formattedDuration).toBeNull();

    vi.setSystemTime("2026-08-12T12:12:00.000Z");
    rerender({ status: "ASSIGNED_ABSENT", activeGap: previousGap });
    expect(result.current.formattedDuration).toBe("00:00:00");

    act(() => vi.advanceTimersByTime(2_000));
    rerender({ status: "ASSIGNED_ABSENT", activeGap: previousGap });
    expect(result.current.formattedDuration).toBe("00:00:02");

    const currentGap = createGap(
      "gap-current",
      "UNCOVERED",
      "2026-08-12T12:11:58.000Z",
    );
    rerender({ status: "ASSIGNED_ABSENT", activeGap: currentGap });

    expect(result.current.formattedDuration).toBe("00:00:04");
  });

  it("uses one clock interval for all active timer subscribers", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

    const unsubscribeFirst = subscribeToCoverageClock(vi.fn());
    const unsubscribeSecond = subscribeToCoverageClock(vi.fn());

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    unsubscribeFirst();
    unsubscribeSecond();
  });

  it("shows the backend gap while live presence is unavailable", () => {
    const activeGap = createGap(
      "gap-active",
      "UNCOVERED",
      "2026-08-12T12:05:00.000Z",
    );

    const { result } = renderHook(() =>
      useLocalCoverageTimer("ASSIGNED_UNKNOWN", activeGap),
    );

    expect(result.current.formattedDuration).toBe("00:05:00");
  });

  it("ignores a stale backend gap when presence becomes unavailable", () => {
    const staleGap = createGap(
      "gap-stale",
      "UNCOVERED",
      "2026-08-12T12:05:00.000Z",
    );
    const { result, rerender } = renderHook(
      ({ status }: { status: MapStatus }) =>
        useLocalCoverageTimer(status, staleGap),
      {
        initialProps: { status: "ASSIGNED_ABSENT" as MapStatus },
      },
    );

    expect(result.current.formattedDuration).toBe("00:05:00");

    rerender({ status: "ASSIGNED_PRESENT" });
    expect(result.current.formattedDuration).toBeNull();

    rerender({ status: "ASSIGNED_UNKNOWN" });
    expect(result.current.gapType).toBeNull();
    expect(result.current.formattedDuration).toBeNull();
  });

  it("does not retry rendering when the clock advances between reads", () => {
    let currentTime = new Date("2026-08-12T12:10:00.000Z").getTime();
    vi.spyOn(Date, "now").mockImplementation(() => {
      currentTime += 1_000;
      return currentTime;
    });

    expect(() =>
      renderHook(() => useLocalCoverageTimer("UNASSIGNED", null)),
    ).not.toThrow();
  });
});
