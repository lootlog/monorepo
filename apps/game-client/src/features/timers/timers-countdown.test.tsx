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
  alwaysVisibleExpiredTimers: {} as Record<string, string[]>,
  contentRenderSpy: vi.fn(),
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
    alwaysVisibleExpiredTimers: testState.alwaysVisibleExpiredTimers,
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
  TimersContent: ({ sortedTimers }: { sortedTimers: TimerWithTimeLeft[] }) => {
    testState.contentRenderSpy();
    return (
      <>
        <output data-testid="timer-countdown">
          {sortedTimers[0]?.maxTimeLeft ?? "missing"}
        </output>
        <output data-testid="timer-order">
          {sortedTimers.map((timer) => timer.timerKey).join(",")}
        </output>
      </>
    );
  },
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

const createLaterTimer = (): Timer => ({
  ...createVisibleTimer(),
  timerKey: "timer-2",
  npcId: 11,
  minSpawnTime: new Date(NOW.getTime() + 59_000).toISOString(),
  maxSpawnTime: new Date(NOW.getTime() + 60_000).toISOString(),
  npc: {
    ...createVisibleTimer().npc,
    id: 11,
    name: "Mushita",
  },
});

describe("visible timer countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    testState.alwaysVisibleExpiredTimers = {};
    testState.contentRenderSpy.mockReset();
    testState.timers = [createVisibleTimer()];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates the structural list only at the timer removal boundary", () => {
    render(<TimersView isOpen isUnderBag />);

    expect(screen.getByTestId("timer-countdown")).toHaveTextContent("5000");
    expect(testState.contentRenderSpy).toHaveBeenCalledOnce();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByTestId("timer-countdown")).toHaveTextContent("5000");
    expect(testState.contentRenderSpy).toHaveBeenCalledOnce();

    act(() => {
      vi.advanceTimersByTime(34_000);
    });

    expect(screen.getByTestId("timer-countdown")).toHaveTextContent("missing");
    expect(testState.contentRenderSpy).toHaveBeenCalledTimes(2);
  });

  it("moves an always-visible expired timer below active timers at the removal boundary", () => {
    testState.alwaysVisibleExpiredTimers = { gefion: ["timer-1"] };
    testState.timers = [createVisibleTimer(), createLaterTimer()];

    render(<TimersView isOpen isUnderBag />);

    expect(screen.getByTestId("timer-order")).toHaveTextContent(
      "timer-1,timer-2",
    );

    act(() => {
      vi.advanceTimersByTime(35_000);
    });

    expect(screen.getByTestId("timer-order")).toHaveTextContent(
      "timer-2,timer-1",
    );
  });

  it("does not keep a clock running when under-bag has no visible timer", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    testState.timers = [];

    render(<TimersView isOpen isUnderBag />);

    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not keep a clock running while the SI timer window is closed", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

    render(<TimersView isOpen={false} isUnderBag={false} />);

    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
