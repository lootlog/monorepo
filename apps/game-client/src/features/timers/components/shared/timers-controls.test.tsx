import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NpcType } from "@/api/npcs.api";
import { useTimerFiltersStore } from "@/features/timers/timer-filters.store";
import type { TimersColorPreferences } from "@/features/timers/hooks/use-timers-window-model";
import { getFixedT } from "@/i18n/get-fixed-t";
import { TimersActions } from "./timers-actions";
import { TimersFilters } from "./timers-filters";

const colors: TimersColorPreferences = {
  timersColors: {},
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
};

const resetStore = () =>
  useTimerFiltersStore.setState({
    timersFilters: {
      "guild-1": {
        minLvl: 10,
        maxLvl: 200,
        selectedNpcTypes: [NpcType.HERO],
        selectedColors: ["red"],
      },
    },
    searchText: "",
  });

const renderFilters = () =>
  render(
    <TimersFilters filtersKey="guild-1" colors={colors} colorFiltersEnabled />,
  );

beforeEach(resetStore);

afterEach(() =>
  useTimerFiltersStore.setState({ timersFilters: {}, searchText: "" }),
);

describe("timers controls", () => {
  it("updates actual search, clamped level ranges, npc types, and color filters", async () => {
    const user = userEvent.setup();
    renderFilters();
    fireEvent.change(screen.getByPlaceholderText("Szukaj..."), {
      target: { value: "tan" },
    });
    expect(useTimerFiltersStore.getState().searchText).toBe("tan");
    fireEvent.change(screen.getByPlaceholderText("Od"), {
      target: { value: "-50" },
    });
    fireEvent.change(screen.getByPlaceholderText("Do"), {
      target: { value: "999" },
    });
    expect(
      useTimerFiltersStore.getState().timersFilters["guild-1"],
    ).toMatchObject({
      minLvl: 0,
      maxLvl: 500,
    });
    await user.click(screen.getByRole("button", { name: "H" }));
    expect(
      useTimerFiltersStore.getState().timersFilters["guild-1"].selectedNpcTypes,
    ).toEqual([]);
    const custom = screen.getAllByRole("button").at(-1);

    if (!custom) throw new Error("Expected custom color trigger");
    await user.hover(custom);
    expect(await screen.findByText("Custom One")).toBeVisible();
    await user.click(custom);
    expect(
      useTimerFiltersStore.getState().timersFilters["guild-1"].selectedColors,
    ).toEqual(["red", "custom-1"]);
  });

  it("selects only the right-clicked npc type and preserves the other filters", () => {
    useTimerFiltersStore.getState().setTimersFilters("guild-1", {
      ...useTimerFiltersStore.getState().timersFilters["guild-1"],
      selectedNpcTypes: [
        NpcType.ELITE2,
        NpcType.ELITE3,
        NpcType.HERO,
        NpcType.TITAN,
      ],
    });
    renderFilters();
    const button = screen.getByRole("button", { name: "E2" });
    const event = createEvent.contextMenu(button);
    fireEvent(button, event);
    expect(event.defaultPrevented).toBe(true);
    expect(useTimerFiltersStore.getState().timersFilters["guild-1"]).toEqual({
      minLvl: 10,
      maxLvl: 200,
      selectedNpcTypes: [NpcType.ELITE2],
      selectedColors: ["red"],
    });
  });

  it("dispatches toolbar actions in regular and under-bag layouts using real controls", async () => {
    const user = userEvent.setup();
    const t = getFixedT("timers");
    const toggleTimerFiltersEnabled = vi.fn<() => void>();
    const toggleColorFiltersEnabled = vi.fn<() => void>();
    const setTimersSortOrder = vi.fn<(order: "asc" | "desc") => void>();
    const setShowHiddenTimers = vi.fn<(show: boolean) => void>();

    const actions = (underBag: boolean) => (
      <TimersActions
        toolbar={{
          filtersEnabled: !underBag,
          toggleFilters: toggleTimerFiltersEnabled,
          colorFiltersEnabled: underBag,
          toggleColorFilters: toggleColorFiltersEnabled,
          sortOrder: underBag ? "desc" : "asc",
          setSortOrder: setTimersSortOrder,
          showHidden: underBag,
          setShowHidden: setShowHiddenTimers,
        }}
      />
    );

    const view = render(actions(false));
    await user.tab();
    expect(
      screen.getByRole("button", { name: t("toolbar.hideFilters") }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.click(
      screen.getByRole("button", { name: t("toolbar.enableColorFilters") }),
    );
    await user.click(
      screen.getByRole("button", { name: t("toolbar.sortDesc") }),
    );
    await user.click(
      screen.getByRole("button", { name: t("toolbar.showHiddenTimers") }),
    );
    expect(toggleTimerFiltersEnabled).toHaveBeenCalledOnce();
    expect(toggleColorFiltersEnabled).toHaveBeenCalledOnce();
    expect(setTimersSortOrder).toHaveBeenCalledWith("desc");
    expect(setShowHiddenTimers).toHaveBeenCalledWith(true);
    view.rerender(actions(true));
    await user.click(
      screen.getByRole("button", { name: t("toolbar.sortAsc") }),
    );
    await user.click(
      screen.getByRole("button", { name: t("toolbar.hideHiddenTimers") }),
    );
    expect(setTimersSortOrder).toHaveBeenCalledWith("asc");
    expect(setShowHiddenTimers).toHaveBeenCalledWith(false);
  });
});
