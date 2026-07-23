import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Timer } from "@/api/timers.api";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import type { TimerWithTimeLeft } from "./utils/timers-utils";

beforeEach(() =>
  setTestRuntimeGame({
    hero: { characterId: "101" },
    world: "gefion",
  }),
);

const testState = vi.hoisted(() => ({
  timers: [] as Timer[],
}));

vi.mock("@/hooks/api/use-timers", () => ({
  useTimers: () => ({ data: testState.timers }),
}));

vi.mock("@/store/settings.store", () => ({
  useSettingsStore: () => ({
    worldByGuildId: { "guild-1": "gefion" },
    allowWorldSelection: false,
    guildIdByCharId: { "101": "guild-1" },
  }),
}));

vi.mock("@/store/timers.store", () => ({
  DEFAULT_TIMERS_FILTERS: {
    minLvl: 0,
    maxLvl: 300,
    selectedNpcTypes: ["hero"],
    selectedColors: [],
  },
  useTimersStore: () => ({
    hiddenTimers: {},
    pinnedTimers: {},
    alwaysVisibleExpiredTimers: {},
    generalConfig: {
      removeTimerAfterMs: 30_000,
      timersGrouping: false,
      countdownMode: "max",
      compactView: false,
    },
    timerFiltersEnabled: false,
    toggleTimerFiltersEnabled: vi.fn(),
    colorFiltersEnabled: false,
    toggleColorFiltersEnabled: vi.fn(),
    timerFiltersSearchText: "",
    timersSortOrder: "asc",
    setTimersSortOrder: vi.fn(),
    timersFilters: {},
    displayConfig: {
      minColumnWidth: 120,
    },
    timersColors: {},
    customColors: {},
    defaultColorNames: {},
    overriddenDefaultColors: {},
  }),
}));

vi.mock("@/store/windows.store", () => ({
  useWindowsStore: (
    selector: (state: { setOpen: ReturnType<typeof vi.fn> }) => unknown,
  ) => selector({ setOpen: vi.fn() }),
}));

vi.mock("@/lib/game", () => ({
  Game: {
    hero: { id: 101 },
    getWorldName: () => "gefion",
  },
}));

vi.mock("@/features/timers/under-bag-timers", () => ({
  UnderBagTimers: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/features/timers/components/timers-under-bag-actions", () => ({
  TimersUnderBagActions: () => null,
}));

vi.mock("@/features/timers/components/timers-content", () => ({
  TimersContent: ({ sortedTimers }: { sortedTimers: TimerWithTimeLeft[] }) => (
    <output data-testid="timer-countdown">
      {sortedTimers[0]?.maxTimeLeft ?? "missing"}
    </output>
  ),
}));

import { TimersView } from "./timers-view";

const NOW = new Date("2026-07-20T10:00:00.000Z");

const createVisibleTimer = (): Timer => ({
  guildId: "guild-1",
  timerKey: "timer-1",
  world: "gefion",
  npcId: 10,
  minSpawnTime: new Date(NOW.getTime() + 4_000).toISOString(),
  maxSpawnTime: new Date(NOW.getTime() + 5_000).toISOString(),
  updatedAt: NOW.toISOString(),
  wasReset: false,
  npc: {
    id: 10,
    name: "Tanroth",
    lvl: 120,
    prof: "W",
    icon: "icon.gif",
    wt: 10,
    type: "hero",
    margonemType: 4,
    location: "Ruins",
  } as never,
});

describe("visible timer countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    testState.timers = [createVisibleTimer()];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates an under-bag timer after every one-second clock tick", () => {
    render(<TimersView isOpen isUnderBag />);

    expect(screen.getByTestId("timer-countdown")).toHaveTextContent("5000");

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByTestId("timer-countdown")).toHaveTextContent("4000");
  });

  it("does not keep a clock running when under-bag has no visible timer", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    testState.timers = [];

    render(<TimersView isOpen isUnderBag />);

    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
