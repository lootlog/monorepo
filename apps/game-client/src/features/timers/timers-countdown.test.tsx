import { act, render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import type { TimersLayout } from "@lootlog/schema/timer-settings";
import { createTimerFixture } from "@/features/timers/model/timer-fixtures";
import {
  createTimerViewFixture,
  seedTimerSettings,
} from "@/features/timers/model/timer-view-fixtures";
import { TimersUnderBag } from "./components/timers-under-bag";
import { TimersWindow } from "./components/timers-window";

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

type MountOptions = {
  timers?: ReturnType<typeof createVisibleTimer>[];
  open?: boolean;
  underBag?: boolean;
  alwaysVisible?: boolean;
  layout?: TimersLayout;
};

const mountTimers = ({
  timers = [createVisibleTimer()],
  open = true,
  underBag = true,
  alwaysVisible = false,
  layout = "modern",
}: MountOptions = {}) => {
  const fixture = createTimerViewFixture(timers);

  const settings: Parameters<typeof seedTimerSettings>[1] = {
    "timers.layout": layout,
  };

  if (alwaysVisible) {
    settings["timers.alwaysVisibleExpiredTimers"] = { gefion: ["Tanroth"] };
  }

  seedTimerSettings(fixture.queryClient, settings);

  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      {underBag ? <TimersUnderBag /> : <TimersWindow isOpen={open} />}
    </QueryClientProvider>,
  );

  onTestFinished(() => {
    view.unmount();
    fixture.cleanup();
  });

  return fixture;
};

// Legacy prefixes the type ("[H] Tanroth"), modern suffixes the level tag.
const timerNames = () =>
  screen.getAllByText(/(Tanroth|Mushita)/).map((node) =>
    node.textContent
      ?.replace(/^\[.*?\]\s*/, "")
      .replace(/\s*\(?\d+\w\)?\s*$/, "")
      .trim(),
  );

it.each<TimersLayout>(["legacy", "modern"])(
  "updates the countdown without remounting the tile and removes it at the expiry boundary (%s)",
  (layout) => {
    mountTimers({ layout });
    const label = screen.getByText(/Tanroth/);
    expect(screen.getByText("00:00:05")).toBeVisible();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("00:00:04")).toBeVisible();
    expect(screen.getByText(/Tanroth/)).toBe(label);
    act(() => vi.advanceTimersByTime(34_000));
    expect(screen.queryByText(/Tanroth/)).not.toBeInTheDocument();
    expect(screen.getByText("Brak timerów")).toBeVisible();
  },
);

it.each<TimersLayout>(["legacy", "modern"])(
  "moves an always-visible expired timer below active timers at the removal boundary (%s)",
  (layout) => {
    mountTimers({
      timers: [createVisibleTimer(), createVisibleTimer("Mushita", 60)],
      alwaysVisible: true,
      layout,
    });
    expect(timerNames()).toEqual(["Tanroth", "Mushita"]);
    act(() => vi.advanceTimersByTime(35_000));
    expect(timerNames()).toEqual(["Mushita", "Tanroth"]);
  },
);

it.each(["empty", "closed"] as const)(
  "does not start a countdown interval for an %s surface",
  (state) => {
    const intervals = vi.spyOn(globalThis, "setInterval");
    mountTimers({
      timers: state === "empty" ? [] : [createVisibleTimer()],
      open: state !== "closed",
      underBag: state !== "closed",
    });
    expect(intervals).not.toHaveBeenCalled();
    expect(screen.queryByText(/Tanroth/)).not.toBeInTheDocument();
  },
);
