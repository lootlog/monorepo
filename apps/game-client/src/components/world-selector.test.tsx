import { render as renderUi, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { getGuildsControllerGetWorldsByGuildIdQueryKey } from "@lootlog/client/main";
import {
  createGuildPreferencesTest,
  createTestGuild,
} from "@/test/guild-preferences-test";
import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";
import { WorldSelector } from "./world-selector";

let harness: ReturnType<typeof createGuildPreferencesTest>;
const render = () => renderUi(<WorldSelector />, { wrapper: harness.wrapper });

describe("WorldSelector", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    harness.queryClient.setQueryData(harness.guildsKey, [
      createTestGuild("guild-1", "Alpha"),
    ]);
    harness.queryClient.setQueryData(
      getGuildsControllerGetWorldsByGuildIdQueryKey({ guildId: "guild-1" }),
      ["tempest"],
    );
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "1",
        characterId: "123",
        currentHp: 1,
        icon: "hero.gif",
        level: 300,
        maxHp: 1,
        name: "Hero",
        profession: "w",
        x: 1,
        y: 2,
      },
      interface: "ni",
      map: { id: 1, name: "Map", visibility: 30 },
      world: "tempest",
    });
    useSettingsStore.setState({
      guildIdByCharId: { "123": "guild-1" },
      worldByGuildId: { "guild-1": "tempest" },
    });
  });

  it("renders when the selected guild is visible", () => {
    render();

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("does not render when every accessible guild is hidden", () => {
    harness.setPreferences({ hiddenGuildIds: ["guild-1"] });

    render();

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
