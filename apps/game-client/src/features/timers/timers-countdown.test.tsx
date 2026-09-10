import { act, render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import { useTimersStore } from "@/store/timers.store";
import { createTimerFixture } from "./timer-fixtures";
import { createTimerViewFixture } from "./timer-view-fixtures";
import { TimersView } from "./timers-view";

const NOW = Date.parse("2026-07-20T10:00:00.000Z");

const createVisibleTimer = (name = "Tanroth", seconds = 5) => {
  const timer = createTimerFixture({
    world: "gefion",
    timerKey: name,
    minSpawnTime: new Date(NOW + (seconds - 1) * 1000).toISOString(),
    maxSpawnTime: new Date(NOW + seconds * 1000).toISOString(),
  });

  return { ...timer, npc: { ...timer.npc, name } };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const mountTimers = (
  timers = [createVisibleTimer()],
  open = true,
  underBag = true,
  alwaysVisible = false,
) => {
  const fixture = createTimerViewFixture(timers);

  if (alwaysVisible)
    useTimersStore.setState({
      alwaysVisibleExpiredTimers: { gefion: ["Tanroth"] },
    });

  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <TimersView isOpen={open} isUnderBag={underBag} />
    </QueryClientProvider>,
  );

  onTestFinished(() => {
    view.unmount();
    fixture.cleanup();
  });

  return fixture;
};

it("updates the countdown without remounting the tile and removes it at the expiry boundary", () => {
  mountTimers();
  const label = screen.getByText(/\[H\] Tanroth/);
  expect(screen.getByText("00:00:05")).toBeVisible();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText("00:00:04")).toBeVisible();
  expect(screen.getByText(/\[H\] Tanroth/)).toBe(label);
  act(() => vi.advanceTimersByTime(34_000));
  expect(screen.queryByText(/\[H\] Tanroth/)).not.toBeInTheDocument();
  expect(screen.getByText("Brak timerów")).toBeVisible();
});

it("moves an always-visible expired timer below active timers at the removal boundary", () => {
  mountTimers(
    [createVisibleTimer(), createVisibleTimer("Mushita", 60)],
    true,
    true,
    true,
  );
  expect(
    screen.getAllByText(/\[H\]/).map((node) => node.textContent?.trim()),
  ).toEqual(["[H] Tanroth", "[H] Mushita"]);
  act(() => vi.advanceTimersByTime(35_000));
  expect(
    screen.getAllByText(/\[H\]/).map((node) => node.textContent?.trim()),
  ).toEqual(["[H] Mushita", "[H] Tanroth"]);
});

it.each(["empty", "closed"] as const)(
  "does not start a countdown interval for an %s surface",
  (state) => {
    const intervals = vi.spyOn(globalThis, "setInterval");
    mountTimers(
      state === "empty" ? [] : [createVisibleTimer()],
      state !== "closed",
      state !== "closed",
    );
    expect(intervals).not.toHaveBeenCalled();
    expect(screen.queryByText(/\[H\] Tanroth/)).not.toBeInTheDocument();
  },
);
