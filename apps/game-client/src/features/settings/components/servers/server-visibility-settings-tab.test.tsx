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

  it("shows ordered guilds with visibility state", () => {
    render();

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Beta", pressed: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Alpha", pressed: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Gamma", pressed: true }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 z 3")).toBeInTheDocument();
  });

  it("filters hidden guilds and searches by name", () => {
    render();

    fireEvent.click(screen.getByRole("button", { name: "Ukryte" }));
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Wszystkie" }));
    fireEvent.change(screen.getByPlaceholderText("Szukaj..."), {
      target: { value: "gamma" },
    });
    expect(screen.getByText("Gamma")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("saves the full hidden guild snapshot", async () => {
    render();

    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));

    await waitFor(() =>
      expect(harness.request.mock.calls[0]?.[1]?.body).toBe(
        JSON.stringify({
          hiddenGuildIds: ["guild-2", "temporarily-unavailable", "guild-1"],
        }),
      ),
    );

    // The save response seeds the cache; no preferences refetch may follow.
    await waitFor(() => expect(harness.queryClient.isMutating()).toBe(0));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(harness.request).toHaveBeenCalledTimes(1);
  });

  it("hides two guilds clicked in quick succession", async () => {
    render();

    // The second click lands before the first save has finished; each write
    // must build on the previous optimistic list, not on the rendered one.
    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
    fireEvent.click(screen.getByRole("button", { name: "Gamma" }));

    await waitFor(() => expect(harness.request).toHaveBeenCalledTimes(2));

    expect(harness.request.mock.calls[1]?.[1]?.body).toBe(
      JSON.stringify({
        hiddenGuildIds: [
          "guild-2",
          "temporarily-unavailable",
          "guild-1",
          "guild-3",
        ],
      }),
    );

    await waitFor(() => expect(harness.queryClient.isMutating()).toBe(0));
    expect(
      screen.getByRole("button", { name: "Alpha", pressed: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Gamma", pressed: false }),
    ).toBeInTheDocument();
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
      screen.queryByRole("button", {
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
