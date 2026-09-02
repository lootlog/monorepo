import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { InputHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NpcType } from "@/api/npcs.api";

const mockSetTimerFiltersSearchText = vi.fn();
const mockSetTimersFilters = vi.fn();
const initialSelectedNpcTypes: NpcType[] = [NpcType.HERO];

let timersStoreState = {
  timerFiltersSearchText: "",
  setTimerFiltersSearchText: mockSetTimerFiltersSearchText,
  timersFilters: {
    "guild-1": {
      minLvl: 10,
      maxLvl: 200,
      selectedNpcTypes: initialSelectedNpcTypes,
      selectedColors: ["red"],
    },
  },
  setTimersFilters: mockSetTimersFilters,
  customColors: {
    "custom-1": {
      id: "custom-1",
      name: "Custom One",
      backgroundColor: "#abc",
      borderColor: "#def",
    },
  },
  defaultColorNames: {
    red: "Red",
  },
  overriddenDefaultColors: {},
  hiddenDefaultColors: ["blue"],
  colorFiltersEnabled: true,
};

vi.mock("@/store/timers.store", () => ({
  DEFAULT_TIMERS_FILTERS: {
    minLvl: 0,
    maxLvl: 300,
    selectedNpcTypes: [
      NpcType.ELITE2,
      NpcType.ELITE3,
      NpcType.HERO,
      NpcType.TITAN,
    ],
    selectedColors: [],
  },
  useTimersStore: () => timersStoreState,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    onChange,
    value,
    ...props
  }: InputHTMLAttributes<HTMLInputElement>) => (
    <input value={value} onChange={onChange} {...props} />
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("lucide-react", () => ({
  Eye: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" onClick={onClick} aria-label="Eye">
      Eye
    </button>
  ),
  EyeOff: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" onClick={onClick} aria-label="EyeOff">
      EyeOff
    </button>
  ),
  Filter: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" onClick={onClick} aria-label="Filter">
      Filter
    </button>
  ),
  Palette: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" onClick={onClick} aria-label="Palette">
      Palette
    </button>
  ),
  SortAsc: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" onClick={onClick} aria-label="SortAsc">
      SortAsc
    </button>
  ),
  SortDesc: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" onClick={onClick} aria-label="SortDesc">
      SortDesc
    </button>
  ),
}));

vi.mock("./global-timer-history-popover", () => ({
  GlobalTimerHistoryPopover: () => null,
}));

import { TimersActions } from "./timers-actions";
import { TimersFilters } from "./timers-filters";
import { TimersUnderBagActions } from "./timers-under-bag-actions";

describe("timers controls", () => {
  beforeEach(() => {
    mockSetTimerFiltersSearchText.mockReset();
    mockSetTimersFilters.mockReset();
    timersStoreState = {
      timerFiltersSearchText: "",
      setTimerFiltersSearchText: mockSetTimerFiltersSearchText,
      timersFilters: {
        "guild-1": {
          minLvl: 10,
          maxLvl: 200,
          selectedNpcTypes: [NpcType.HERO],
          selectedColors: ["red"],
        },
      },
      setTimersFilters: mockSetTimersFilters,
      customColors: {
        "custom-1": {
          id: "custom-1",
          name: "Custom One",
          backgroundColor: "#abc",
          borderColor: "#def",
        },
      },
      defaultColorNames: {
        red: "Red",
      },
      overriddenDefaultColors: {},
      hiddenDefaultColors: ["blue"],
      colorFiltersEnabled: true,
    };
  });

  it("updates search, clamped level ranges, npc types, and colors", async () => {
    const user = userEvent.setup();

    render(<TimersFilters filtersKey="guild-1" />);

    fireEvent.change(screen.getByPlaceholderText("Szukaj..."), {
      target: { value: "tan" },
    });
    expect(mockSetTimerFiltersSearchText).toHaveBeenLastCalledWith("tan");

    fireEvent.change(screen.getByPlaceholderText("Od"), {
      target: { value: "-50" },
    });
    expect(mockSetTimersFilters).toHaveBeenCalledWith(
      "guild-1",
      expect.objectContaining({
        minLvl: 0,
      }),
    );

    fireEvent.change(screen.getByPlaceholderText("Do"), {
      target: { value: "999" },
    });
    expect(mockSetTimersFilters).toHaveBeenCalledWith(
      "guild-1",
      expect.objectContaining({
        maxLvl: 500,
      }),
    );

    await user.click(screen.getByRole("button", { name: "H" }));
    expect(mockSetTimersFilters).toHaveBeenCalledWith(
      "guild-1",
      expect.objectContaining({
        selectedNpcTypes: [],
      }),
    );

    const colorButtons = screen.getAllByRole("button");
    const lastColorButton = colorButtons.at(-1);
    if (!lastColorButton) throw new Error("Expected a color button");
    await user.click(lastColorButton);
    expect(mockSetTimersFilters).toHaveBeenCalledWith(
      "guild-1",
      expect.objectContaining({
        selectedColors: ["red", "custom-1"],
      }),
    );
  });

  it("selects only the right-clicked npc type", () => {
    timersStoreState.timersFilters["guild-1"].selectedNpcTypes = [
      NpcType.ELITE2,
      NpcType.ELITE3,
      NpcType.HERO,
      NpcType.TITAN,
    ];

    render(<TimersFilters filtersKey="guild-1" />);

    const elite2Button = screen.getByRole("button", { name: "E2" });
    const contextMenuEvent = createEvent.contextMenu(elite2Button);
    fireEvent(elite2Button, contextMenuEvent);

    expect(contextMenuEvent.defaultPrevented).toBe(true);
    expect(mockSetTimersFilters).toHaveBeenCalledWith("guild-1", {
      minLvl: 10,
      maxLvl: 200,
      selectedNpcTypes: [NpcType.ELITE2],
      selectedColors: ["red"],
    });
  });

  it("dispatches toolbar actions for regular and under-bag controls", async () => {
    const user = userEvent.setup();
    const toggleTimerFiltersEnabled = vi.fn();
    const toggleColorFiltersEnabled = vi.fn();
    const setTimersSortOrder = vi.fn();
    const setShowHiddenTimers = vi.fn();

    const { rerender } = render(
      <TimersActions
        timerFiltersEnabled
        toggleTimerFiltersEnabled={toggleTimerFiltersEnabled}
        colorFiltersEnabled={false}
        toggleColorFiltersEnabled={toggleColorFiltersEnabled}
        timersSortOrder="asc"
        setTimersSortOrder={setTimersSortOrder}
        showHiddenTimers={false}
        setShowHiddenTimers={setShowHiddenTimers}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(screen.getByRole("button", { name: "Palette" }));
    await user.click(screen.getByRole("button", { name: "SortAsc" }));
    await user.click(screen.getByRole("button", { name: "EyeOff" }));

    expect(toggleTimerFiltersEnabled).toHaveBeenCalledTimes(1);
    expect(toggleColorFiltersEnabled).toHaveBeenCalledTimes(1);
    expect(setTimersSortOrder).toHaveBeenCalledWith("desc");
    expect(setShowHiddenTimers).toHaveBeenCalledWith(true);

    rerender(
      <TimersUnderBagActions
        timerFiltersEnabled={false}
        toggleTimerFiltersEnabled={toggleTimerFiltersEnabled}
        colorFiltersEnabled
        toggleColorFiltersEnabled={toggleColorFiltersEnabled}
        timersSortOrder="desc"
        setTimersSortOrder={setTimersSortOrder}
        showHiddenTimers
        setShowHiddenTimers={setShowHiddenTimers}
      />,
    );

    await user.click(screen.getByRole("button", { name: "SortDesc" }));
    await user.click(screen.getByRole("button", { name: "Eye" }));

    expect(setTimersSortOrder).toHaveBeenCalledWith("asc");
    expect(setShowHiddenTimers).toHaveBeenCalledWith(false);
  });
});
