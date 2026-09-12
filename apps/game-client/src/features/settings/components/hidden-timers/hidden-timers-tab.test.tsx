import { render as renderUi, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { seedGuildTimerLists } from "@/features/timers/model/timer-view-fixtures";
import { readGuildTimerLists } from "@/features/timers/settings/timer-settings-writers";
import { seedSettingsDocumentValues } from "@/test/settings-documents-fixtures";
import { HiddenTimersTab } from "./hidden-timers-tab";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const render = () =>
  renderUi(<HiddenTimersTab />, { wrapper: harness.wrapper });

describe("HiddenTimersTab", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    seedGuildTimerLists(harness.queryClient, {
      "guild-1": { hiddenTimers: ["Alpha hidden boss"] },
      "guild-2": { hiddenTimers: ["Beta hidden boss"] },
      "guild-3": {},
    });
    seedSettingsDocumentValues(harness.queryClient, {
      "timers.hiddenTimers": ["Global hidden boss"],
      "timers.generalConfig": { timersGrouping: false },
    });
  });

  it("auto-selects the first guild and lets the user switch the scope", async () => {
    const user = userEvent.setup();

    render();

    expect(screen.getByText("Alpha hidden boss")).toBeInTheDocument();

    const guildSelect = screen.getByRole("combobox", { name: "Lootlog" });

    expect(guildSelect).toHaveTextContent("Alpha");

    await user.click(guildSelect);
    await user.click(await screen.findByRole("option", { name: /Beta/ }));

    expect(screen.getByText("Beta hidden boss")).toBeInTheDocument();
  });

  it("restores a hidden timer from the list", async () => {
    const user = userEvent.setup();

    render();

    await user.click(screen.getByRole("button", { name: "Przywróć" }));

    expect(readGuildTimerLists("guild-1").hiddenTimers).toEqual([]);
    expect(screen.queryByText("Alpha hidden boss")).not.toBeInTheDocument();
    expect(screen.getByText("Brak ukrytych timerów.")).toBeInTheDocument();
  });

  it("hides the selector when grouping is enabled", () => {
    seedSettingsDocumentValues(harness.queryClient, {
      "timers.generalConfig": { timersGrouping: true },
    });

    render();

    expect(
      screen.queryByRole("combobox", { name: "Lootlog" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Global hidden boss")).toBeInTheDocument();
    expect(screen.queryByText("Alpha hidden boss")).not.toBeInTheDocument();
  });
});
