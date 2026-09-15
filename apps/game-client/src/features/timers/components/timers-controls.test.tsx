import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NpcType } from "@/api/npcs.api";
import { useTimersStore } from "@/store/timers.store";
import { getFixedT } from "@/i18n/get-fixed-t";
import { TimersActions } from "./timers-actions";
import { TimersFilters } from "./timers-filters";

const resetStore = () =>
  useTimersStore.setState(useTimersStore.getInitialState(), true);

beforeEach(() => {
  resetStore();
  useTimersStore.setState({
    timersFilters: {
      "guild-1": {
        minLvl: 10,
        maxLvl: 200,
        selectedNpcTypes: [NpcType.HERO],
        selectedColors: ["red"],
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
    render(<TimersFilters filtersKey="guild-1" />);
    fireEvent.change(screen.getByPlaceholderText("Szukaj..."), {
      target: { value: "tan" },
    });
    expect(useTimersStore.getState().timerFiltersSearchText).toBe("tan");
    fireEvent.change(screen.getByLabelText("Poziom od"), {
      target: { value: "-50" },
    });
    fireEvent.change(screen.getByLabelText("Poziom do"), {
      target: { value: "999" },
    });
    expect(useTimersStore.getState().timersFilters["guild-1"]).toMatchObject({
      minLvl: 0,
      maxLvl: 500,
    });
    await user.click(screen.getByRole("button", { name: "Typy potworów" }));
    await user.click(await screen.findByRole("button", { name: "heros" }));
    expect(
      useTimersStore.getState().timersFilters["guild-1"].selectedNpcTypes,
    ).toEqual([]);
    await user.keyboard("{Escape}");
    const custom = screen.getAllByRole("button").at(-1);

    if (!custom) throw new Error("Expected custom color trigger");
    await user.hover(custom);
    expect(await screen.findByText("Custom One")).toBeVisible();
    await user.click(custom);
    expect(
      useTimersStore.getState().timersFilters["guild-1"].selectedColors,
    ).toEqual(["red", "custom-1"]);
  });

  it("selects only the right-clicked npc type and preserves the other filters", async () => {
    const user = userEvent.setup();
    useTimersStore.getState().setTimersFilters("guild-1", {
      ...useTimersStore.getState().timersFilters["guild-1"],
      selectedNpcTypes: [
        NpcType.ELITE2,
        NpcType.ELITE3,
        NpcType.HERO,
        NpcType.TITAN,
      ],
    });
    render(<TimersFilters filtersKey="guild-1" />);
    await user.click(screen.getByRole("button", { name: "Typy potworów" }));
    const button = await screen.findByRole("button", { name: "elita II" });
    const event = createEvent.contextMenu(button);
    fireEvent(button, event);
    expect(event.defaultPrevented).toBe(true);
    expect(useTimersStore.getState().timersFilters["guild-1"]).toEqual({
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
        timerFiltersEnabled={!underBag}
        toggleTimerFiltersEnabled={toggleTimerFiltersEnabled}
        colorFiltersEnabled={underBag}
        toggleColorFiltersEnabled={toggleColorFiltersEnabled}
        timersSortOrder={underBag ? "desc" : "asc"}
        setTimersSortOrder={setTimersSortOrder}
        showHiddenTimers={underBag}
        setShowHiddenTimers={setShowHiddenTimers}
      />
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
  });
});
