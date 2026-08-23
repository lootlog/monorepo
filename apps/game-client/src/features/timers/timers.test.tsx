import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Timer } from "@/api/timers.api";
import { setTestRuntimeGame } from "@/test/test-runtime-window";

const mockUseTimers = vi.fn();
const mockUseTimersSocket = vi.fn();
const mockUseTimersFiltering = vi.fn();
const mockCalculateColorStatistics = vi.fn();
const mockCheckFiltersActive = vi.fn();
const mockToggleOpen = vi.fn();
const mockSetOpen = vi.fn();
const mockSetSelectedGuildIdsForTimers = vi.fn();
const mockSetTimerFiltersSearchText = vi.fn();
const mockSetTimersFilters = vi.fn();
const timersContentSpy = vi.fn();
const timersActionsSpy = vi.fn();
const timersUnderBagActionsSpy = vi.fn();

let timersOpen = true;
let worldByGuildId: Record<string, string> = {
  "guild-1": "gefion",
};
let allowWorldSelection = true;
let guildIdByCharId: Record<string, string> = {
  "101": "guild-1",
};
let timersStoreState = {
  hiddenTimers: {},
  pinnedTimers: {},
  alwaysVisibleExpiredTimers: {},
  generalConfig: {
    removeTimerAfterMs: 30_000,
    timersGrouping: false,
    timersUnderBag: false,
    countdownMode: "max" as const,
    compactView: false,
  },
  timerFiltersEnabled: true,
  toggleTimerFiltersEnabled: vi.fn(),
  colorFiltersEnabled: true,
  toggleColorFiltersEnabled: vi.fn(),
  timerFiltersSearchText: "tan",
  setTimerFiltersSearchText: mockSetTimerFiltersSearchText,
  timersSortOrder: "asc" as const,
  setTimersSortOrder: vi.fn(),
  timersFilters: {},
  setTimersFilters: mockSetTimersFilters,
  displayConfig: {
    showType: true,
    showLevel: false,
    fontSize: 11,
    minColumnWidth: 120,
    singleTimerDisplayMode: "row" as const,
  },
  timersColors: {},
  customColors: {},
  defaultColorNames: {},
  overriddenDefaultColors: {},
};

vi.mock("@/hooks/api/use-timers", () => ({
  useTimers: (...args: unknown[]) => mockUseTimers(...args),
}));

vi.mock("@/store/windows.store", () => ({
  useWindowsStore: (
    selector: (state: {
      timers: { open: boolean };
      toggleOpen: typeof mockToggleOpen;
      setOpen: typeof mockSetOpen;
    }) => unknown,
  ) =>
    selector({
      timers: { open: timersOpen },
      toggleOpen: mockToggleOpen,
      setOpen: mockSetOpen,
    }),
}));

vi.mock("@/store/settings.store", () => ({
  useSettingsStore: () => ({
    worldByGuildId,
    allowWorldSelection,
    guildIdByCharId,
  }),
}));

vi.mock("@/store/timers.store", () => ({
  DEFAULT_TIMERS_FILTERS: {
    minLvl: 0,
    maxLvl: 300,
    selectedNpcTypes: ["hero", "elite2", "elite3", "titan"],
    selectedColors: [],
  },
  useTimersStore: () => timersStoreState,
}));

vi.mock("@/features/timers/hooks/use-timers-socket", () => ({
  useTimersSocket: () => mockUseTimersSocket(),
}));

vi.mock("@/features/timers/hooks/use-timers-filtering", () => ({
  useTimersFiltering: (...args: unknown[]) => mockUseTimersFiltering(...args),
}));

vi.mock("@/features/timers/utils/color-statistics", () => ({
  calculateColorStatistics: (...args: unknown[]) =>
    mockCalculateColorStatistics(...args),
}));

vi.mock("@/features/timers/utils/filters-utils", () => ({
  checkFiltersActive: (...args: unknown[]) => mockCheckFiltersActive(...args),
}));

vi.mock("@/components/draggable-window", () => ({
  DraggableWindow: ({
    children,
    isOpen,
    title,
    actions,
  }: {
    children: ReactNode;
    isOpen: boolean;
    title: string;
    actions?: ReactNode;
  }) => (
    <div data-testid="draggable-window" data-open={String(isOpen)}>
      <h1>{title}</h1>
      {actions}
      {children}
    </div>
  ),
}));

vi.mock("@/features/timers/under-bag-timers", () => ({
  UnderBagTimers: ({ children }: { children: ReactNode }) => (
    <div data-testid="under-bag">{children}</div>
  ),
}));

vi.mock("@/features/timers/components/timers-actions", () => ({
  TimersActions: (props: unknown) => {
    timersActionsSpy(props);
    return <div>TimersActions</div>;
  },
}));

vi.mock("@/features/timers/components/timers-under-bag-actions", () => ({
  TimersUnderBagActions: (props: unknown) => {
    timersUnderBagActionsSpy(props);
    return <div>TimersUnderBagActions</div>;
  },
}));

vi.mock("@/features/timers/components/timers-content", () => ({
  TimersContent: (props: unknown) => {
    timersContentSpy(props);
    return <div>TimersContent</div>;
  },
}));

import { Timers } from "./timers";

const createTimer = (overrides?: Partial<Timer>): Timer => ({
  guildId: overrides?.guildId ?? "guild-1",
  timerKey: overrides?.timerKey ?? "timer-1",
  world: overrides?.world ?? "pandora",
  npcId: overrides?.npcId ?? 10,
  minSpawnTime: overrides?.minSpawnTime ?? "2099-04-22T10:00:00.000Z",
  maxSpawnTime: overrides?.maxSpawnTime ?? "2099-04-22T10:05:00.000Z",
  updatedAt: overrides?.updatedAt ?? "2099-04-22T09:59:00.000Z",
  wasReset: overrides?.wasReset ?? false,
  npc: {
    id: overrides?.npc?.id ?? 10,
    name: overrides?.npc?.name ?? "Tanroth",
    lvl: overrides?.npc?.lvl ?? 120,
    prof: overrides?.npc?.prof ?? "W",
    icon: overrides?.npc?.icon ?? "icon.gif",
    wt: overrides?.npc?.wt ?? 10,
    type: overrides?.npc?.type ?? "hero",
    margonemType: overrides?.npc?.margonemType ?? 4,
    location: overrides?.npc?.location ?? "Ruins",
  } as never,
  member: overrides?.member,
});

describe("Timers", () => {
  beforeEach(() => {
    setTestRuntimeGame({
      hero: { characterId: "101" },
      interface: "si",
      world: "pandora",
    });
    mockUseTimers.mockReset();
    mockUseTimersSocket.mockReset();
    mockUseTimersFiltering.mockReset();
    mockCalculateColorStatistics.mockReset();
    mockCheckFiltersActive.mockReset();
    mockToggleOpen.mockReset();
    mockSetOpen.mockReset();
    mockSetSelectedGuildIdsForTimers.mockReset();
    mockSetTimerFiltersSearchText.mockReset();
    mockSetTimersFilters.mockReset();
    timersContentSpy.mockReset();
    timersActionsSpy.mockReset();
    timersUnderBagActionsSpy.mockReset();

    timersOpen = true;
    worldByGuildId = {
      "guild-1": "gefion",
    };
    allowWorldSelection = true;
    guildIdByCharId = {
      "101": "guild-1",
    };
    timersStoreState = {
      ...timersStoreState,
      hiddenTimers: {},
      pinnedTimers: {},
      alwaysVisibleExpiredTimers: {},
      generalConfig: {
        removeTimerAfterMs: 30_000,
        timersGrouping: false,
        timersUnderBag: false,
        countdownMode: "max",
        compactView: false,
      },
      timerFiltersEnabled: true,
      colorFiltersEnabled: true,
      timerFiltersSearchText: "tan",
      timersSortOrder: "asc",
      timersFilters: {},
      timersColors: {},
      customColors: {},
      defaultColorNames: {},
      overriddenDefaultColors: {},
      displayConfig: {
        showType: true,
        showLevel: false,
        fontSize: 11,
        minColumnWidth: 120,
        singleTimerDisplayMode: "row",
      },
    };

    mockUseTimers.mockReturnValue({
      data: [],
      error: null,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseTimersFiltering.mockImplementation(
      ({ calculatedTimers }: { calculatedTimers: unknown }) => calculatedTimers,
    );
    mockCalculateColorStatistics.mockReturnValue([
      { color: "red", total: 1, active: 1, name: "Red" },
    ]);
    mockCheckFiltersActive.mockReturnValue(true);
  });

  it("queries timers once for the selected guild world and passes deduplicated data to the content", () => {
    mockUseTimers.mockReturnValue({
      data: [
        createTimer({
          guildId: "guild-1",
          timerKey: "same",
        }),
        createTimer({
          guildId: "guild-1",
          timerKey: "same",
          updatedAt: "2099-04-22T09:59:01.000Z",
        }),
      ],
    });

    render(<Timers />);

    expect(mockUseTimers).toHaveBeenCalledTimes(1);
    expect(mockUseTimers).toHaveBeenCalledWith({
      world: "gefion",
    });
    expect(mockUseTimersSocket).toHaveBeenCalledTimes(1);
    const filteringInput = mockUseTimersFiltering.mock.calls[0]?.[0] as
      | { calculatedTimers: unknown[] }
      | undefined;
    expect(filteringInput?.calculatedTimers).toHaveLength(1);
    expect(mockUseTimersFiltering).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: "guild-1",
        isGrouping: false,
        searchText: "tan",
      }),
    );
    expect(timersContentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        settingsKey: "guild-1",
        areFiltersActive: true,
        colorStatistics: [{ color: "red", total: 1, active: 1, name: "Red" }],
        compactView: false,
      }),
    );
    expect(screen.getByText("TimersActions")).toBeInTheDocument();
  });

  it("passes initial loading and retry state to the timer content", () => {
    const refetch = vi.fn();
    const error = new Error("network");
    mockUseTimers.mockReturnValue({
      data: undefined,
      error,
      isFetching: false,
      isLoading: false,
      refetch,
    });

    render(<Timers />);

    expect(timersContentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        error,
        initialLoading: false,
        onRetry: expect.any(Function),
      }),
    );

    const contentProps = timersContentSpy.mock.calls[0]?.[0] as {
      onRetry: () => void;
    };
    contentProps.onRetry();
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("opens add timer with the selected timers guild", () => {
    render(<Timers />);

    const timersContentProps = timersContentSpy.mock.calls[0]?.[0] as {
      onAddTimer: () => void;
    };

    timersContentProps.onAddTimer();

    expect(mockSetSelectedGuildIdsForTimers).not.toHaveBeenCalled();
    expect(mockSetOpen).toHaveBeenCalledWith("add-timer", true, {
      guildId: "guild-1",
    });
    expect(mockToggleOpen).not.toHaveBeenCalled();
  });

  it("resets timer filters without removing saved hidden timers", () => {
    timersStoreState = {
      ...timersStoreState,
      hiddenTimers: {
        "guild-1": ["timer-1"],
      },
    };
    render(<Timers />);

    const timersContentProps = timersContentSpy.mock.calls.at(-1)?.[0] as {
      onResetFilters: () => void;
    };

    act(() => timersContentProps.onResetFilters());

    expect(mockSetTimerFiltersSearchText).toHaveBeenCalledWith("");
    expect(mockSetTimersFilters).toHaveBeenCalledWith("guild-1", {
      minLvl: 0,
      maxLvl: 300,
      selectedNpcTypes: ["hero", "elite2", "elite3", "titan"],
      selectedColors: [],
    });
    expect(timersStoreState.hiddenTimers).toEqual({
      "guild-1": ["timer-1"],
    });
    expect(mockUseTimersFiltering).toHaveBeenLastCalledWith(
      expect.objectContaining({
        showHiddenTimers: true,
      }),
    );
  });

  it("renders the under-bag path when enabled for the ni interface", () => {
    setTestRuntimeGame({
      hero: { characterId: "101" },
      interface: "ni",
      world: "pandora",
    });
    allowWorldSelection = false;
    worldByGuildId = {};
    guildIdByCharId = {};
    timersStoreState = {
      ...timersStoreState,
      generalConfig: {
        ...timersStoreState.generalConfig,
        timersUnderBag: true,
      },
    };
    mockUseTimers.mockReturnValue({
      data: [createTimer()],
    });

    render(<Timers />);

    expect(mockUseTimers).toHaveBeenCalledWith({
      world: "pandora",
    });
    expect(screen.getByTestId("under-bag")).toBeInTheDocument();
    expect(screen.getByText("TimersUnderBagActions")).toBeInTheDocument();
    expect(screen.queryByTestId("draggable-window")).not.toBeInTheDocument();
    expect(timersContentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        isUnderBag: true,
      }),
    );
  });

  it("keeps the under-bag clock idle when every timer is filtered out", () => {
    setTestRuntimeGame({
      hero: { characterId: "101" },
      interface: "ni",
      world: "pandora",
    });
    timersStoreState = {
      ...timersStoreState,
      generalConfig: {
        ...timersStoreState.generalConfig,
        timersUnderBag: true,
      },
    };
    mockUseTimers.mockReturnValue({ data: [createTimer()] });
    mockUseTimersFiltering.mockReturnValue([]);

    render(<Timers />);

    expect(timersContentSpy).toHaveBeenCalledWith(
      expect.objectContaining({ sortedTimers: [] }),
    );
  });

  it("keeps only socket ingress active while the timers window is hidden", () => {
    timersOpen = false;

    render(<Timers />);

    expect(mockUseTimersSocket).toHaveBeenCalledOnce();
    expect(mockUseTimers).not.toHaveBeenCalled();
    expect(timersContentSpy).not.toHaveBeenCalled();
  });
});
