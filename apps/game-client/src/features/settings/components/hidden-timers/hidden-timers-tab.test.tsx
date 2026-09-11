import { render as renderUi, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useTimersStore } from "@/store/timers.store";
import { HiddenTimersTab } from "./hidden-timers-tab";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const render = () =>
  renderUi(<HiddenTimersTab />, { wrapper: harness.wrapper });

describe("HiddenTimersTab", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    useTimersStore.setState({
      hiddenTimers: {
        "guild-1": ["Alpha hidden boss"],
        "guild-2": ["Beta hidden boss"],
        global: ["Global hidden boss"],
      },
    });
    useTimersStore.setState((state) => ({
      ...state,
      generalConfig: {
        ...state.generalConfig,
        timersGrouping: false,
      },
    }));
  });

  it("auto-selects the first guild and lets the user switch the scope", async () => {
    const user = userEvent.setup();

    render();

    expect(screen.getByText("Alpha hidden boss")).toBeInTheDocument();

    const guildSelect = screen.getByRole("combobox", { name: "Serwer" });

    expect(guildSelect).toHaveTextContent("Alpha");

    await user.click(guildSelect);
    await user.click(await screen.findByRole("option", { name: /Beta/ }));

    expect(screen.getByText("Beta hidden boss")).toBeInTheDocument();
  });

  it("restores a hidden timer from the list", async () => {
    const user = userEvent.setup();

    render();

    await user.click(screen.getByRole("button", { name: "Przywróć" }));

    expect(useTimersStore.getState().hiddenTimers["guild-1"]).toEqual([]);
    expect(screen.queryByText("Alpha hidden boss")).not.toBeInTheDocument();
    expect(screen.getByText("Brak ukrytych timerów.")).toBeInTheDocument();
  });

  it("hides the selector when grouping is enabled", () => {
    useTimersStore.setState((state) => ({
      ...state,
      generalConfig: {
        ...state.generalConfig,
        timersGrouping: true,
      },
    }));

    render();

    expect(
      screen.queryByRole("combobox", { name: "Serwer" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Global hidden boss")).toBeInTheDocument();
    expect(screen.queryByText("Alpha hidden boss")).not.toBeInTheDocument();
  });
});
