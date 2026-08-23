import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permission } from "@lootlog/types";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import type { TimerWithTimeLeft } from "../utils/timers-utils";

beforeEach(() => setTestRuntimeGame());

const timerContextMenuSpy = vi.fn();
const timerTooltipSpy = vi.fn();
const mockUseTimerActions = vi.fn();
const mockUseTimerDisplay = vi.fn();
const tileSpy = vi.fn();

let timersStoreState = {
  customColors: {},
  defaultColorNames: {},
  overriddenDefaultColors: {},
  hiddenDefaultColors: [],
  generalConfig: {
    timersGrouping: false,
  },
};

let guildPermissions: Permission[] = [];

vi.mock("@/components/ui/context-menu", () => ({
  ContextMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  ContextMenuTrigger: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
  ContextMenuContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/tile", () => ({
  Tile: ({
    children,
    ...props
  }: {
    children: ReactNode;
    color?: string;
    customBorderColor?: string;
    customBackgroundColor?: string;
    id: string;
  }) => {
    tileSpy(props);
    return <div data-testid="tile">{children}</div>;
  },
}));

vi.mock("@/store/timers.store", () => ({
  useTimersStore: (selector: (state: typeof timersStoreState) => unknown) =>
    selector(timersStoreState),
}));

vi.mock("../hooks/use-timer-actions", () => ({
  useTimerActions: (...args: unknown[]) => mockUseTimerActions(...args),
}));

vi.mock("../hooks/use-timer-display", () => ({
  useTimerDisplay: (...args: unknown[]) => mockUseTimerDisplay(...args),
}));

vi.mock("./timer-context-menu-content", () => ({
  TimerContextMenuContent: (props: unknown) => {
    timerContextMenuSpy(props);
    return <div>TimerContextMenuContent</div>;
  },
}));

vi.mock("./timer-tooltip", () => ({
  TimerTooltip: (props: unknown) => {
    timerTooltipSpy(props);
    return <div>TimerTooltip</div>;
  },
}));

vi.mock("./timer-live-tile", () => ({
  TimerLiveTile: (props: { label: string; timer: TimerWithTimeLeft }) => {
    tileSpy(props);
    return (
      <div data-testid="tile">
        <span>{props.label}</span>
        <span>{`time:${props.timer.maxTimeLeft}`}</span>
      </div>
    );
  },
}));

vi.mock("@lootlog/api-client/react-query/main/guilds", () => ({
  getGuildsControllerGetGuildPermissionsQueryKey: ({
    guildId,
  }: {
    guildId: string;
  }) => ["permissions", guildId],
  useGuildsControllerGetGuildPermissions: () => ({
    data: guildPermissions,
  }),
}));

vi.mock("@/lib/game", () => ({
  Game: {
    getWorldName: () => "pandora",
  },
}));

vi.mock("@/utils/parse-ms-to-time", () => ({
  parseMsToTime: (timeLeft: number) => `time:${timeLeft}`,
}));

vi.mock("lucide-react", () => ({
  Loader2: () => <span>Loader2</span>,
}));

import { SingleTimer } from "./single-timer";

const createTimer = (): TimerWithTimeLeft =>
  ({
    id: "timer-1",
    guildId: "guild-1",
    timerKey: "timer-1",
    world: "pandora",
    npcId: 10,
    minSpawnTime: "2026-04-22T10:00:00.000Z",
    maxSpawnTime: "2026-04-22T10:05:00.000Z",
    updatedAt: "2026-04-22T09:59:00.000Z",
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
    minTimeLeft: 5_000,
    maxTimeLeft: 10_000,
  }) as TimerWithTimeLeft;

describe("SingleTimer", () => {
  beforeEach(() => {
    document.body.className = "";
    timerContextMenuSpy.mockReset();
    timerTooltipSpy.mockReset();
    tileSpy.mockReset();
    guildPermissions = [];
    timersStoreState = {
      customColors: {},
      defaultColorNames: {},
      overriddenDefaultColors: {},
      hiddenDefaultColors: [],
      generalConfig: {
        timersGrouping: false,
      },
    };
    mockUseTimerActions.mockReset();
    mockUseTimerDisplay.mockReset();

    mockUseTimerActions.mockReturnValue({
      isPinned: true,
      handleHideTimer: vi.fn(),
      handleHideTimerForAll: vi.fn(),
      handleShowTimer: vi.fn(),
      handleShowTimerForAll: vi.fn(),
      handlePinTimer: vi.fn(),
      handlePinTimerForAll: vi.fn(),
      handleUnpinTimerForAll: vi.fn(),
      handleTimerColorChange: vi.fn(),
      handleRestartTimer: vi.fn(),
      handleDeleteTimer: vi.fn(),
    });

    mockUseTimerDisplay.mockReturnValue({
      isPending: false,
      selectedColor: "red",
      customColor: undefined,
      overriddenColor: undefined,
      resetIndicator: "[R] ",
      shortname: "[H]",
      npcDetails: "(120w)",
      countdownMode: "max",
      displayConfig: {
        fontSize: 11,
        singleTimerDisplayMode: "row",
      },
    });
  });

  it("renders timer content, tooltip data, and forwards permissions to the context menu", () => {
    guildPermissions = [
      Permission.LOOTLOG_TIMERS_DELETE,
      Permission.LOOTLOG_TIMERS_RESET,
    ];

    render(
      <SingleTimer
        guildIds={["guild-1", "guild-2"]}
        guildNamesById={{ "guild-1": "Alpha" }}
        guildPermissions={guildPermissions}
        timer={createTimer()}
        settingsKey="guild-1"
      />,
    );

    expect(screen.getByText(/\[R] \[H] Tanroth \(120w\)/)).toBeVisible();
    expect(screen.getByText("time:10000")).toBeVisible();
    expect(screen.getByText("TimerContextMenuContent")).toBeVisible();
    expect(screen.getByText("TimerTooltip")).toBeVisible();

    expect(tileSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "10",
        color: "red",
        customBorderColor: undefined,
        customBackgroundColor: undefined,
      }),
    );
    expect(timerContextMenuSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        isPinned: true,
        canDelete: true,
        canReset: true,
        timersGrouping: false,
        selectedColor: "red",
      }),
    );
    expect(timerTooltipSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        timer: createTimer(),
        guildNamesById: { "guild-1": "Alpha" },
      }),
    );
    expect(mockUseTimerActions).toHaveBeenCalledWith(
      createTimer(),
      "guild-1",
      "pandora",
      ["guild-1", "guild-2"],
      false,
    );
  });

  it("shows the pending overlay, respects hidden state, and uses custom colors", () => {
    timersStoreState = {
      ...timersStoreState,
      generalConfig: {
        timersGrouping: true,
      },
    };
    mockUseTimerDisplay.mockReturnValue({
      isPending: true,
      selectedColor: "red",
      customColor: {
        id: "custom-1",
        name: "Custom",
        borderColor: "#111",
        backgroundColor: "#222",
      },
      overriddenColor: undefined,
      resetIndicator: "",
      shortname: "[T]",
      npcDetails: "",
      countdownMode: "min",
      displayConfig: {
        fontSize: 13,
        singleTimerDisplayMode: "column",
      },
    });

    document.body.classList.add("si");

    const { container } = render(
      <SingleTimer
        guildIds={["guild-1"]}
        guildNamesById={{}}
        guildPermissions={guildPermissions}
        timer={createTimer()}
        settingsKey="guild-1"
        isHidden
      />,
    );

    expect(screen.getByText("Loader2")).toBeVisible();
    expect(container.querySelector(".ll\\:opacity-50")).toBeTruthy();
    expect(tileSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        color: undefined,
        customBorderColor: "#111",
        customBackgroundColor: "#222",
      }),
    );
    expect(timerContextMenuSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        isHidden: true,
        timersGrouping: true,
      }),
    );
    expect(screen.getByText("time:10000")).toBeVisible();
  });
});
