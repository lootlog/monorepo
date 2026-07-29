import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TimerWithTimeLeft } from "../utils/timers-utils";

const footerSpy = vi.fn();
const gridSpy = vi.fn();
const emptyStateSpy = vi.fn();

vi.mock("@/components/guild-switcher", () => ({
  GuildSwitcher: () => <div>GuildSwitcher</div>,
}));

vi.mock("@/components/world-selector", () => ({
  WorldSelector: () => <div>WorldSelector</div>,
}));

vi.mock("./timers-filters", () => ({
  TimersFilters: ({ filtersKey }: { filtersKey: string }) => (
    <div>TimersFilters:{filtersKey}</div>
  ),
}));

vi.mock("./timers-grid", () => ({
  TimersGrid: (props: unknown) => {
    gridSpy(props);
    return <div>TimersGrid</div>;
  },
}));

vi.mock("./timers-empty-state", () => ({
  TimersEmptyState: (props: unknown) => {
    emptyStateSpy(props);
    return <div>TimersEmptyState</div>;
  },
}));

vi.mock("./timers-footer", () => ({
  TimersFooter: (props: unknown) => {
    footerSpy(props);
    return <button type="button">TimersFooter</button>;
  },
}));

import { TimersContent } from "./timers-content";

const timer = {
  guildId: "guild-1",
  timerKey: "timer-1",
  world: "pandora",
  npcId: 10,
  minSpawnTime: "2099-04-22T10:00:00.000Z",
  maxSpawnTime: "2099-04-22T10:05:00.000Z",
  updatedAt: "2099-04-22T09:59:00.000Z",
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
  minTimeLeft: 60_000,
  maxTimeLeft: 120_000,
} satisfies TimerWithTimeLeft;

describe("TimersContent", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows timer placeholders instead of the empty state during initial loading", () => {
    vi.useFakeTimers();

    render(
      <TimersContent
        sortedTimers={[]}
        settingsKey="guild-1"
        hiddenTimers={[]}
        areFiltersActive={false}
        colorStatistics={[]}
        isGrouping={false}
        allowWorldSelection={false}
        timerFiltersEnabled={false}
        isUnderBag={false}
        initialLoading
        minColumnWidth={180}
        onAddTimer={vi.fn()}
        onResetFilters={vi.fn()}
      />,
    );

    expect(screen.queryByText("TimersEmptyState")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(200));

    expect(screen.getByRole("status").querySelector("svg")).toHaveClass(
      "ll:animate-spin",
    );
    expect(screen.queryByText("TimersEmptyState")).not.toBeInTheDocument();
  });

  it("shows a retry action when the initial timer request fails", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <TimersContent
        sortedTimers={[]}
        settingsKey="guild-1"
        hiddenTimers={[]}
        areFiltersActive={false}
        colorStatistics={[]}
        error={new Error("network")}
        isGrouping={false}
        allowWorldSelection={false}
        timerFiltersEnabled={false}
        isUnderBag={false}
        minColumnWidth={180}
        onAddTimer={vi.fn()}
        onResetFilters={vi.fn()}
        onRetry={onRetry}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));

    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByText("TimersEmptyState")).not.toBeInTheDocument();
  });

  it("renders selectors, filters, grid, and footer when the content is populated", async () => {
    const user = userEvent.setup();
    const onAddTimer = vi.fn();

    render(
      <TimersContent
        sortedTimers={[timer]}
        settingsKey="guild-1"
        hiddenTimers={["Mushita"]}
        areFiltersActive
        colorStatistics={[{ color: "red", total: 1, active: 1, name: "Red" }]}
        guildId="guild-1"
        isGrouping={false}
        allowWorldSelection
        timerFiltersEnabled
        isUnderBag={false}
        minColumnWidth={180}
        onAddTimer={onAddTimer}
        onResetFilters={vi.fn()}
        world="pandora"
      />,
    );

    expect(screen.getByText("GuildSwitcher")).toBeInTheDocument();
    expect(screen.getByText("WorldSelector")).toBeInTheDocument();
    expect(screen.getByText("TimersFilters:guild-1")).toBeInTheDocument();
    expect(screen.getByText("TimersGrid")).toBeInTheDocument();
    expect(gridSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        hiddenTimers: ["Mushita"],
        minColumnWidth: 180,
      }),
    );

    await user.click(screen.getByRole("button", { name: "TimersFooter" }));
    expect(footerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: "guild-1",
        isGrouping: false,
        onAddTimer,
        world: "pandora",
      }),
    );

    const scrollContainer = screen.getByTestId("timers-scroll-container");
    const scrollViewport = scrollContainer.querySelector(
      "[data-ll-scroll-area-viewport]",
    );

    expect(scrollContainer).toHaveClass(
      "ll:min-h-0",
      "ll:h-full",
      "ll:overflow-hidden",
    );
    expect(scrollViewport).toHaveStyle({
      overflowX: "hidden",
      overflowY: "scroll",
    });
  });

  it("keeps timer content draggable with the scrollbar hidden", () => {
    const onPointerDown = vi.fn();

    render(
      <div onPointerDown={onPointerDown}>
        <TimersContent
          sortedTimers={[timer]}
          settingsKey="guild-1"
          hiddenTimers={[]}
          areFiltersActive={false}
          colorStatistics={[]}
          isGrouping={false}
          allowWorldSelection={false}
          timerFiltersEnabled={false}
          isUnderBag={false}
          minColumnWidth={180}
          onAddTimer={vi.fn()}
          onResetFilters={vi.fn()}
        />
      </div>,
    );

    const scrollContainer = screen.getByTestId("timers-scroll-container");
    const timerContent = screen.getByText("TimersGrid");

    fireEvent.pointerDown(scrollContainer);
    expect(onPointerDown).toHaveBeenCalledOnce();

    fireEvent.pointerDown(timerContent);
    expect(onPointerDown).toHaveBeenCalledTimes(2);
  });

  it("renders the empty state and suppresses footer/filters when compact or empty", () => {
    render(
      <TimersContent
        sortedTimers={[]}
        settingsKey="guild-1"
        hiddenTimers={[]}
        areFiltersActive={false}
        colorStatistics={[]}
        guildId="guild-1"
        isGrouping
        allowWorldSelection={false}
        timerFiltersEnabled={false}
        isUnderBag
        minColumnWidth={120}
        onAddTimer={vi.fn()}
        onResetFilters={vi.fn()}
        world="pandora"
        compactView
      />,
    );

    expect(screen.queryByText("GuildSwitcher")).not.toBeInTheDocument();
    expect(screen.queryByText("WorldSelector")).not.toBeInTheDocument();
    expect(screen.queryByText("TimersFilters:guild-1")).not.toBeInTheDocument();
    expect(screen.getByText("TimersEmptyState")).toBeInTheDocument();
    expect(emptyStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        areFiltersActive: false,
      }),
    );
    expect(
      screen.queryByRole("button", { name: "TimersFooter" }),
    ).not.toBeInTheDocument();
  });
});
