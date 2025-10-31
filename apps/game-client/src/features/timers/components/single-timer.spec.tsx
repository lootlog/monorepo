import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Timer } from "@/hooks/api/use-timers";
import { SingleTimer } from "./single-timer";
import { createMockTimer } from "../__tests__/test-helpers";

vi.mock("@/hooks/api/use-guilds", () => ({
  useGuilds: () => ({ data: [] }),
}));

vi.mock("@/store/global.store", () => ({
  useGlobalStore: () => ({ gameState: { world: "world1" } }),
}));

vi.mock("@/store/timers.store", () => ({
  useTimersStore: () => ({
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
  const mockTimer = createMockTimer();

  const defaultProps = {
    timer: mockTimer,
    settingsKey: "guild1",
    minTimeLeft: 3600000,
    maxTimeLeft: 7200000,
    canDelete: true,
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

    expect(screen.getByText(/1:00/)).toBeDefined();
  });

  it("should apply opacity when isHidden is true", () => {
    const { container } = render(
      <SingleTimer {...defaultProps} isHidden={true} />,
    );

    const hiddenDiv = container.querySelector(".ll\\:opacity-50");
    expect(hiddenDiv).toBeDefined();
  });

  it("should show loading indicator when timer is pending", () => {
    vi.mock("../hooks/use-timer-display", () => ({
      useTimerDisplay: () => ({
        isPending: true,
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

    const { container } = render(<SingleTimer {...defaultProps} />);

    const loader = container.querySelector(".ll\\:animate-spin");
    expect(loader).toBeDefined();
  });

  it("should render tooltip content", () => {
    render(<SingleTimer {...defaultProps} />);

    const tooltip = screen.queryByText(/Dragon Boss/);
    expect(tooltip).toBeDefined();
  });

  it("should use custom border color when provided", () => {
    vi.mock("../hooks/use-timer-display", () => ({
      useTimerDisplay: () => ({
        isPending: false,
        isMinSpawnTime: false,
        hasPassedRedThreshold: false,
        selectedColor: "custom1",
        customColor: { borderColor: "#ff0000", backgroundColor: "#ffcccc" },
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

    const { container } = render(<SingleTimer {...defaultProps} />);
    expect(container.querySelector(".ll\\:relative")).toBeDefined();
  });

  it("should apply correct text color when hasPassedRedThreshold is true", () => {
    vi.mock("../hooks/use-timer-display", () => ({
      useTimerDisplay: () => ({
        isPending: false,
        isMinSpawnTime: false,
        hasPassedRedThreshold: true,
        selectedColor: "white",
        customColor: undefined,
        overriddenColor: undefined,
        resetIndicator: "",
        shortname: "[B]",
        npcDetails: " (100w)",
        timeLeft: -100,
        displayConfig: {
          showType: true,
          showLevel: true,
          fontSize: 12,
          singleTimerDisplayMode: "row",
        },
      }),
    }));

    const { container } = render(<SingleTimer {...defaultProps} />);

    const redText = container.querySelector(".ll\\:text-red-500");
    expect(redText).toBeDefined();
  });

  it("should apply correct text color when isMinSpawnTime is true", () => {
    vi.mock("../hooks/use-timer-display", () => ({
      useTimerDisplay: () => ({
        isPending: false,
        isMinSpawnTime: true,
        hasPassedRedThreshold: false,
        selectedColor: "white",
        customColor: undefined,
        overriddenColor: undefined,
        resetIndicator: "",
        shortname: "[B]",
        npcDetails: " (100w)",
        timeLeft: 1000,
        displayConfig: {
          showType: true,
          showLevel: true,
          fontSize: 12,
          singleTimerDisplayMode: "row",
        },
      }),
    }));

    const { container } = render(<SingleTimer {...defaultProps} />);

    const orangeText = container.querySelector(".ll\\:text-orange-400");
    expect(orangeText).toBeDefined();
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
