import {
  fireEvent,
  render as renderUi,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ServerVisibilitySettingsTab } from "./server-visibility-settings-tab";
import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";

import {
  createGuildPreferencesTest,
  createTestGuild,
} from "@/test/guild-preferences-test";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const render = () =>
  renderUi(<ServerVisibilitySettingsTab />, { wrapper: harness.wrapper });

describe("ServerVisibilitySettingsTab", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    harness.queryClient.setQueryData(harness.guildsKey, [
      createTestGuild("guild-1", "Alpha"),
      {
        ...createTestGuild("guild-2", "Beta"),
        icon: "https://cdn.discordapp.com/icons/guild-2/beta.png",
      },
      createTestGuild("guild-3", "Gamma"),
    ]);
    harness.setPreferences({
      guildsOrder: ["guild-2", "guild-1"],
      hiddenGuildIds: ["guild-2", "temporarily-unavailable"],
    });
    useGameStore.getState().clearGame();
    useSettingsStore.setState({
      guildIdByCharId: {},
      presenceOrganizationIdsByCharId: {},
    });
  });

  it("shows ordered guilds with avatars and visibility state", () => {
    render();

    expect(
      document.querySelector(
        'img[src="https://cdn.discordapp.com/icons/guild-2/beta.png"]',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Beta" })).not.toBeChecked();
    expect(screen.getByRole("switch", { name: "Alpha" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Gamma" })).toBeChecked();
  });

  it("filters hidden guilds and searches by name", () => {
    render();

    fireEvent.click(screen.getByRole("button", { name: "Ukryte" }));
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Wszystkie" }));
    fireEvent.change(screen.getByPlaceholderText("Szukaj Lootloga"), {
      target: { value: "gamma" },
    });
    expect(screen.getByText("Gamma")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("saves the full hidden guild snapshot", async () => {
    render();

    fireEvent.click(
      screen.getByRole("switch", {
        name: "Alpha",
      }),
    );

    await waitFor(() =>
      expect(harness.request.mock.calls[0]?.[1]?.body).toBe(
        JSON.stringify({
          hiddenGuildIds: ["guild-2", "temporarily-unavailable", "guild-1"],
        }),
      ),
    );
  });

  it("shows every guild with one reset action", async () => {
    render();

    fireEvent.click(
      screen.getByRole("button", { name: "Pokaż wszystkie (1)" }),
    );

    await waitFor(() =>
      expect(harness.request.mock.calls[0]?.[1]?.body).toBe(
        JSON.stringify({
          hiddenGuildIds: ["temporarily-unavailable"],
        }),
      ),
    );
  });

  it("hides presence publication controls while preserving stored preferences", () => {
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "20",
        characterId: "10",
        clan: { id: 30, name: "Clan", rank: 1 },
        currentHp: 100,
        icon: "hero.gif",
        level: 100,
        maxHp: 100,
        name: "Hero",
        profession: "w",
        x: 1,
        y: 2,
      },
      interface: "ni",
      map: { id: 100, name: "Karka-han", visibility: 0 },
      world: "alpha",
    });
    useSettingsStore.setState({
      guildIdByCharId: { "10": "guild-1" },
      presenceOrganizationIdsByCharId: { "10": ["guild-1"] },
    });

    render();

    expect(
      screen.queryByRole("switch", {
        name: "Publikuj obecność w organizacji Alpha",
      }),
    ).not.toBeInTheDocument();
    expect(useSettingsStore.getState().presenceOrganizationIdsByCharId).toEqual(
      {
        "10": ["guild-1"],
      },
    );
  });
});
