import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NpcType } from "@/api/npcs.api";
import { getCharacterFilterKey } from "@/lib/character-filter-scope";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useTimersStore } from "@/store/timers.store";
import { getFixedT } from "@/i18n/get-fixed-t";
import { createTimerHttpFixture } from "../timer-http-fixtures";
import { TimersActions } from "./timers-actions";
import { TimersFilters } from "./timers-filters";

const scopeKey = JSON.stringify(["luvia", "202", "101", "luvia"]);

const filtersKey = getCharacterFilterKey(scopeKey, "guild-1");

const resetStore = () =>
  useTimersStore.setState(useTimersStore.getInitialState(), true);

beforeEach(() => {
  resetStore();
  setTestRuntimeGame();
  useTimersStore.setState({
    timersFilters: {
      [filtersKey]: {
        minLvl: 10,
        maxLvl: 200,
        selectedNpcTypes: [NpcType.HERO],
        selectedColors: ["red"],
        selectedLists: [],
      },
    },
    customColors: {
      "custom-1": {
        id: "custom-1",
        name: "Custom One",
        backgroundColor: "#abc",
        borderColor: "#def",
      },
    },
    defaultColorNames: { red: "Red" },
    overriddenDefaultColors: {},
    hiddenDefaultColors: ["blue"],
    colorFiltersEnabled: true,
  });
});

afterEach(resetStore);

describe("timers controls", () => {
  it("updates actual search, clamped level ranges, npc types, and color filters", async () => {
    const user = userEvent.setup();
    render(<TimersFilters filtersKey="guild-1" world="luvia" />);
    fireEvent.change(screen.getByPlaceholderText("Szukaj…"), {
      target: { value: "tan" },
    });
    expect(useTimersStore.getState().timerFiltersSearchText).toBe("tan");
    fireEvent.change(screen.getByLabelText("Poziom od"), {
      target: { value: "-50" },
    });
    fireEvent.change(screen.getByLabelText("Poziom do"), {
      target: { value: "999" },
    });
    expect(useTimersStore.getState().timersFilters[filtersKey]).toMatchObject({
      minLvl: 0,
      maxLvl: 500,
    });
    // Lowering the upper bound under the lower one drags the lower one along
    // instead of leaving a range that matches no timer.
    fireEvent.change(screen.getByLabelText("Poziom od"), {
      target: { value: "300" },
    });
    fireEvent.change(screen.getByLabelText("Poziom do"), {
      target: { value: "100" },
    });
    expect(useTimersStore.getState().timersFilters[filtersKey]).toMatchObject({
      minLvl: 100,
      maxLvl: 100,
    });
    await user.click(screen.getByRole("button", { name: "Typy potworów" }));
    await user.click(await screen.findByRole("button", { name: "Heros" }));
    expect(
      useTimersStore.getState().timersFilters[filtersKey].selectedNpcTypes,
    ).toEqual([]);
    await user.keyboard("{Escape}");
    const custom = screen.getAllByRole("button").at(-1);

    if (!custom) throw new Error("Expected custom color trigger");
    await user.hover(custom);
    expect(await screen.findByText("Custom One")).toBeVisible();
    await user.click(custom);
    expect(
      useTimersStore.getState().timersFilters[filtersKey].selectedColors,
    ).toEqual(["red", "custom-1"]);
  });

  it("selects only one npc type by right-click or its visible button and preserves the other filters", async () => {
    const user = userEvent.setup();
    useTimersStore.getState().setTimersFilters(scopeKey, "guild-1", {
      ...useTimersStore.getState().timersFilters[filtersKey],
      selectedNpcTypes: [
        NpcType.ELITE2,
        NpcType.ELITE3,
        NpcType.HERO,
        NpcType.TITAN,
      ],
    });
    render(<TimersFilters filtersKey="guild-1" world="luvia" />);
    await user.click(screen.getByRole("button", { name: "Typy potworów" }));
    const button = await screen.findByRole("button", { name: "Elita II" });
    const event = createEvent.contextMenu(button);
    fireEvent(button, event);
    expect(event.defaultPrevented).toBe(true);
    expect(useTimersStore.getState().timersFilters[filtersKey]).toEqual({
      minLvl: 10,
      maxLvl: 200,
      selectedNpcTypes: [NpcType.ELITE2],
      selectedColors: ["red"],
      selectedLists: [],
    });
    await user.click(
      screen.getByRole("button", { name: "Pokaż tylko: Tytan" }),
    );
    expect(
      useTimersStore.getState().timersFilters[filtersKey].selectedNpcTypes,
    ).toEqual([NpcType.TITAN]);
  });

  it("switches to one player list, back to several and to all without touching the other filters", async () => {
    const user = userEvent.setup();
    useTimersStore.setState({
      customLists: {
        e2: { id: "e2", name: "E2", npcNames: ["Kic"] },
        heroes: { id: "heroes", name: "Herosi", npcNames: ["Tanroth"] },
      },
    });
    render(<TimersFilters filtersKey="guild-1" world="luvia" />);
    await user.click(screen.getByRole("button", { name: "E2" }));
    const heroes = screen.getByRole("button", { name: "Herosi" });
    const event = createEvent.contextMenu(heroes);
    fireEvent(heroes, event);
    expect(event.defaultPrevented).toBe(true);
    expect(useTimersStore.getState().timersFilters[filtersKey]).toEqual({
      minLvl: 10,
      maxLvl: 200,
      selectedNpcTypes: [NpcType.HERO],
      selectedColors: ["red"],
      selectedLists: ["heroes"],
    });
    await user.click(screen.getByRole("button", { name: "E2" }));
    expect(
      useTimersStore.getState().timersFilters[filtersKey].selectedLists,
    ).toEqual(["heroes", "e2"]);
    await user.click(screen.getByRole("button", { name: "Wszystkie" }));
    expect(
      useTimersStore.getState().timersFilters[filtersKey].selectedLists,
    ).toEqual([]);
  });

  it("dispatches toolbar actions in regular and under-bag layouts using real controls", async () => {
    const user = userEvent.setup();
    const t = getFixedT("timers");
    const toggleTimerFiltersEnabled = vi.fn<() => void>();
    const toggleColorFiltersEnabled = vi.fn<() => void>();
    const setTimersSortOrder = vi.fn<(order: "asc" | "desc") => void>();
    const setShowHiddenTimers = vi.fn<(show: boolean) => void>();
    const onAddTimer = vi.fn<() => void>();
    const fixture = createTimerHttpFixture();

    const actions = (underBag: boolean) => (
      <QueryClientProvider client={fixture.queryClient}>
        <TimersActions
          timerFiltersEnabled={!underBag}
          toggleTimerFiltersEnabled={toggleTimerFiltersEnabled}
          colorFiltersEnabled={underBag}
          toggleColorFiltersEnabled={toggleColorFiltersEnabled}
          timersSortOrder={underBag ? "desc" : "asc"}
          setTimersSortOrder={setTimersSortOrder}
          showHiddenTimers={underBag}
          setShowHiddenTimers={setShowHiddenTimers}
          guildId="guild-1"
          world="luvia"
          isGrouping={underBag}
          addTimerOpen={underBag}
          onAddTimer={onAddTimer}
        />
      </QueryClientProvider>
    );

    const view = render(actions(false));
    await user.tab();
    expect(
      screen.getByRole("button", { name: t("toolbar.options") }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");

    const filtersOption = await screen.findByRole("button", {
      name: t("toolbar.filters"),
    });

    expect(filtersOption).toHaveAttribute("aria-pressed", "true");
    await user.click(filtersOption);
    await user.click(
      screen.getByRole("button", { name: t("toolbar.colorFilters") }),
    );
    await user.click(
      screen.getByRole("button", { name: t("toolbar.sortDesc") }),
    );
    await user.click(
      screen.getByRole("button", { name: t("toolbar.hiddenTimers") }),
    );
    expect(toggleTimerFiltersEnabled).toHaveBeenCalledOnce();
    expect(toggleColorFiltersEnabled).toHaveBeenCalledOnce();
    expect(setTimersSortOrder).toHaveBeenCalledWith("desc");
    expect(setShowHiddenTimers).toHaveBeenCalledWith(true);
    view.rerender(actions(true));
    expect(
      screen.getByRole("button", { name: t("toolbar.colorFilters") }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.click(
      screen.getByRole("button", { name: t("toolbar.sortAsc") }),
    );
    await user.click(
      screen.getByRole("button", { name: t("toolbar.hiddenTimers") }),
    );
    expect(setTimersSortOrder).toHaveBeenCalledWith("asc");
    expect(setShowHiddenTimers).toHaveBeenCalledWith(false);
    expect(
      screen.queryByRole("button", { name: t("toolbar.history") }),
    ).not.toBeInTheDocument();
    view.rerender(actions(false));
    expect(
      screen.getByRole("button", { name: t("toolbar.history") }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: t("toolbar.addTimer") }),
    );
    expect(onAddTimer).toHaveBeenCalledOnce();
    fixture.cleanup();
  });
});
