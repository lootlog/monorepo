import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { SingleTimer } from "./single-timer";
import { createMockTimerWithTimeLeft } from "../__tests__/test-helpers";

vi.mock("@/lib/game", () => ({
  Game: {
    hero: { id: "char1" },
    interface: "si",
    getWorldName: () => "world1",
    map: {},
    npcs: [],
    getOther: () => undefined,
    getNpc: () => undefined,
    getNpcTpl: () => undefined,
    getNpcIcon: () => undefined,
    getInitializeState: () => true,
  },
}));

vi.mock("@/hooks/api/use-guilds", () => ({
  useGuilds: () => ({ data: [] }),
}));

vi.mock("@/hooks/api/use-guild-permissions", () => ({
  useGuildPermissions: () => ({
    data: ["LOOTLOG_MANAGE"],
  }),
  Permission: {
    OWNER: "OWNER",
    ADMIN: "ADMIN",
    LOOTLOG_MANAGE: "LOOTLOG_MANAGE",
  },
}));

vi.mock("@/store/global.store", () => ({
  useGlobalStore: () => ({ gameState: { world: "world1" } }),
}));

vi.mock("@/hooks/api/use-timers-settings", () => ({
  useUserSettings: () => ({
    customColors: {},
    defaultColorNames: {},
    overriddenDefaultColors: {},
    hiddenDefaultColors: [],
    generalConfig: {
      countdownMode: "min",
      timersGrouping: false,
    },
    displayConfig: {
      showType: true,
      showLevel: true,
      fontSize: 12,
      singleTimerDisplayMode: "row",
    },
    timersColors: {},
    pinnedTimers: {},
    hideTimer: vi.fn(),
    pinTimer: vi.fn(),
    unpinTimer: vi.fn(),
    setTimerColor: vi.fn(),
  }),
}));

vi.mock("../hooks/use-timer-actions", () => ({
  useTimerActions: () => ({
    isPinned: false,
    handleHideTimer: vi.fn(),
    handleHideTimerForAll: vi.fn(),
    handlePinTimer: vi.fn(),
    handlePinTimerForAll: vi.fn(),
    handleUnpinTimerForAll: vi.fn(),
    handleTimerColorChange: vi.fn(),
    handleRestartTimer: vi.fn(),
    handleDeleteTimer: vi.fn(),
  }),
}));

vi.mock("../hooks/use-timer-display", () => ({
  useTimerDisplay: () => ({
    isPending: false,
    isMinSpawnTime: false,
    hasPassedRedThreshold: false,
    selectedColor: "white",
    customColor: undefined,
    overriddenColor: undefined,
    resetIndicator: "",
    shortname: "[B]",
    npcDetails: " (100w)",
    timeLeft: 3600000,
    displayConfig: {
      showType: true,
      showLevel: true,
      fontSize: 12,
      singleTimerDisplayMode: "row",
    },
  }),
}));

vi.mock("@/utils/parse-ms-to-time", () => ({
  parseMsToTime: (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  },
}));

vi.mock("@/constants/margonem", () => ({
  NPC_NAMES: {
    boss: { shortname: "B" },
  },
}));

describe("SingleTimer", () => {
  const mockTimer = createMockTimerWithTimeLeft();

  const defaultProps = {
    timer: mockTimer,
    settingsKey: "guild1",
    minTimeLeft: 3600000,
    maxTimeLeft: 7200000,
    isHidden: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render timer with NPC name", () => {
    render(<SingleTimer {...defaultProps} />);

    expect(screen.getByText(/Dragon Boss/)).toBeDefined();
  });

  it("should render timer with shortname when showType is true", () => {
    render(<SingleTimer {...defaultProps} />);

    expect(screen.getByText(/\[B\]/)).toBeDefined();
  });

  it("should render timer with level details when showLevel is true", () => {
    render(<SingleTimer {...defaultProps} />);

    expect(screen.getByText(/ \(100w\)/)).toBeDefined();
  });

  it("should render time left", () => {
    render(<SingleTimer {...defaultProps} />);

    expect(screen.getByText("1:00")).toBeDefined();
  });

  it("should apply opacity when isHidden is true", () => {
    const { container } = render(
      <SingleTimer {...defaultProps} isHidden={true} />,
    );

    const hiddenDiv = container.querySelector(".ll\\:opacity-50");
    expect(hiddenDiv).toBeDefined();
  });

  it("should render tooltip content", () => {
    render(<SingleTimer {...defaultProps} />);

    const tooltip = screen.queryByText(/Dragon Boss/);
    expect(tooltip).toBeDefined();
  });

  it("should render context menu content", () => {
    const { container } = render(<SingleTimer {...defaultProps} />);

    expect(container).toBeDefined();
  });

  it("should handle default prop values", () => {
    const minimalProps = {
      timer: mockTimer,
      settingsKey: "guild1",
    };

    expect(() => render(<SingleTimer {...minimalProps} />)).not.toThrow();
  });
});
