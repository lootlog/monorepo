// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TimerCountdown } from "./timer-countdown";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("updates the spawn window and warning colors, and clamps an expired countdown", () => {
  vi.useFakeTimers();
  vi.setSystemTime("2026-09-05T12:00:00Z");
  const now = Date.now();
  const { unmount } = render(
    <TimerCountdown minSpawnTime={now + 1000} maxSpawnTime={now + 32_000} />,
  );

  expect(screen.getByText("00:00:01")).toBeTruthy();
  expect(screen.getByText("00:00:32").className).not.toContain(
    "text-orange-400",
  );
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.queryByText("00:00:01")).toBeNull();
  expect(screen.getByText("00:00:31").className).toContain("text-orange-400");
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText("00:00:30").className).not.toContain("text-red-500");
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText("00:00:29").className).toContain("text-red-500");
  act(() => vi.advanceTimersByTime(60_000));
  expect(screen.getByText("00:00:00").className).toContain("text-red-500");

  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it("uses an updated spawn window when a timer is reset", () => {
  vi.useFakeTimers();
  vi.setSystemTime("2026-09-05T12:00:00Z");
  const now = Date.now();
  const { rerender } = render(
    <TimerCountdown minSpawnTime={now - 1000} maxSpawnTime={now + 10_000} />,
  );
  expect(screen.getByText("00:00:10").className).toContain("text-red-500");
  act(() => vi.advanceTimersByTime(1000));
  rerender(
    <TimerCountdown minSpawnTime={now + 61_000} maxSpawnTime={now + 121_000} />,
  );
  expect(screen.getByText("00:01:00")).toBeTruthy();
  expect(screen.getByText("00:02:00").className).not.toContain("text-red-500");
  expect(screen.getByText("00:02:00").className).not.toContain(
    "text-orange-400",
  );
});
