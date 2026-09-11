import {
  accountPreferenceValues,
  createSettingsDocuments,
  readSeededSettingsDocuments,
  seedSettingsDocuments,
} from "@/test/settings-documents-fixtures";
import { createGameAccountPreferences } from "@/test/game-account-preferences-fixtures";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import {
  act,
  render as renderUi,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Profiler } from "react";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { beforeEach, describe, expect, it } from "vitest";

import { NotificationsSettingsTab } from "./notifications-settings-tab";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const seedAccountPreferences = (
  preferences: Parameters<typeof accountPreferenceValues>[0],
) =>
  seedSettingsDocuments(
    harness.queryClient,
    createSettingsDocuments(accountPreferenceValues(preferences)),
  );

beforeEach(() => {
  harness = createGuildPreferencesTest();
});

const render = () => {
  let commits = 0;

  return renderUi(
    <Profiler
      id="settings"
      onRender={() => {
        commits += 1;

        if (commits > 20)
          throw new Error(
            "Settings repeatedly reset their form without input changes",
          );
      }}
    >
      <NotificationsSettingsTab />
    </Profiler>,
    { wrapper: harness.wrapper },
  );
};

describe("NotificationsSettingsTab", () => {
  it("shows every option of every category at once, dimming rows that are off", () => {
    setTestRuntimeGame({ hero: { accountId: "202" } });
    const initial = createGameAccountPreferences("202");
    initial.notifications.HERO.show = false;
    initial.notifications.COLOSSUS.show = true;
    seedAccountPreferences(initial);
    render();

    expect(
      screen.getByRole("table", { name: "Co pokazywać" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { expanded: false })).toBeNull();

    for (const category of ["ELITE2", "HERO", "COLOSSUS", "TITAN", "message"]) {
      expect(document.getElementById(`${category}-show`)).toBeInTheDocument();
    }

    expect(document.getElementById("HERO-show")).not.toBeChecked();
    expect(document.getElementById("HERO-highlight")).toBeDisabled();
    expect(document.getElementById("HERO-auto-hide-timeout")).toBeDisabled();

    expect(document.getElementById("ELITE2-highlight")).toBeDisabled();
    expect(document.getElementById("COLOSSUS-highlight")).toBeEnabled();
  });

  it("toggles a switch from a click anywhere in its cell, leaving disabled cells alone", async () => {
    const user = userEvent.setup();
    setTestRuntimeGame({ hero: { accountId: "202" } });
    const initial = createGameAccountPreferences("202");
    initial.notifications.HERO.show = false;
    initial.notifications.HERO.highlight = false;
    initial.notifications.COLOSSUS.show = true;
    initial.notifications.COLOSSUS.highlight = false;
    seedAccountPreferences(initial);
    render();

    const cellOf = (id: string) => {
      const cell = document.getElementById(id)?.closest("td");

      if (!cell) throw new Error(`Missing cell for ${id}`);

      return cell;
    };

    await user.click(cellOf("COLOSSUS-highlight"));
    expect(document.getElementById("COLOSSUS-highlight")).toBeChecked();

    // A click on the switch itself must not be forwarded a second time.
    await user.click(
      screen.getByRole("switch", { name: "Kolos: Podświetlenie" }),
    );
    expect(document.getElementById("COLOSSUS-highlight")).not.toBeChecked();

    await user.click(cellOf("HERO-highlight"));
    expect(document.getElementById("HERO-highlight")).not.toBeChecked();
  });

  it("switches a whole column on unless every editable row is already on, skipping rows that are off", async () => {
    const user = userEvent.setup();
    setTestRuntimeGame({ hero: { accountId: "202" } });
    const initial = createGameAccountPreferences("202");
    initial.notifications.HERO.show = true;
    initial.notifications.HERO.highlight = true;
    initial.notifications.COLOSSUS.show = true;
    initial.notifications.COLOSSUS.highlight = false;
    initial.notifications.TITAN.show = false;
    initial.notifications.TITAN.highlight = false;
    seedAccountPreferences(initial);
    render();

    const header = screen.getByRole("button", { name: "Podświetlenie" });

    await user.click(header);
    expect(document.getElementById("HERO-highlight")).toBeChecked();
    expect(document.getElementById("COLOSSUS-highlight")).toBeChecked();
    expect(document.getElementById("TITAN-highlight")).not.toBeChecked();

    await user.click(header);
    expect(document.getElementById("HERO-highlight")).not.toBeChecked();
    expect(document.getElementById("COLOSSUS-highlight")).not.toBeChecked();
    expect(document.getElementById("TITAN-highlight")).not.toBeChecked();
  });

  it("saves the shared server list once instead of per category", async () => {
    const user = userEvent.setup();
    setTestRuntimeGame({ hero: { accountId: "202" } });
    const initial = createGameAccountPreferences("202");
    initial.notifications.HERO.show = false;
    initial.notifications.guildIds = ["guild-1", "guild-2"];
    seedAccountPreferences(initial);
    harness.request.mockImplementation(() =>
      Promise.resolve(
        Response.json(readSeededSettingsDocuments(harness.queryClient)),
      ),
    );
    render();

    const picker = screen.getByRole("group", { name: "Lootlogi" });
    const [alpha, beta] = within(picker).getAllByRole("button");

    if (!alpha || !beta) throw new Error("no guild tile");
    expect(alpha).toHaveAttribute("aria-pressed", "true");
    expect(beta).toHaveAttribute("aria-pressed", "true");
    await user.click(beta);

    await waitFor(() => {
      const body = JSON.parse(String(harness.request.mock.calls[0]?.[1]?.body));
      expect(body.operations[0].set.presentation).toEqual({
        guildIds: ["guild-1"],
      });
    });
  });

  it("autosaves a committed auto-hide timeout clamped to the allowed range", async () => {
    const user = userEvent.setup();
    setTestRuntimeGame({ hero: { accountId: "202" } });
    const initial = createGameAccountPreferences("202");
    initial.notifications.ELITE2.show = true;
    seedAccountPreferences(initial);
    harness.request.mockImplementation(() =>
      Promise.resolve(
        Response.json(readSeededSettingsDocuments(harness.queryClient)),
      ),
    );
    render();

    const timeout = document.getElementById("ELITE2-auto-hide-timeout");

    if (!(timeout instanceof HTMLInputElement)) throw new Error("no input");
    await user.clear(timeout);
    await user.type(timeout, "9999");
    expect(harness.request).not.toHaveBeenCalled();
    await user.tab();

    await waitFor(() => {
      const body = JSON.parse(String(harness.request.mock.calls[0]?.[1]?.body));
      expect(body.operations[0].set.presentation.ELITE2.autoHideTimeout).toBe(
        600,
      );
    });
  });
  it("applies refreshed account preferences without restarting the form reset loop", async () => {
    setTestRuntimeGame({ hero: { accountId: "202" } });

    const initial = createGameAccountPreferences("202");
    initial.notifications.ELITE2.show = true;
    seedAccountPreferences(initial);
    render();
    const control = document.getElementById("ELITE2-show");
    expect(control).toBeChecked();
    act(() =>
      seedAccountPreferences({
        ...initial,
        notifications: {
          ...initial.notifications,
          ELITE2: { ...initial.notifications.ELITE2, show: false },
        },
      }),
    );
    await waitFor(() => expect(control).not.toBeChecked());
  });
});
