import { storageKey } from "@/lib/storage-key";
import { afterEach, describe, expect, it } from "vitest";
import { useSettingsStore } from "./settings.store";

const SETTINGS_STORAGE_KEY = storageKey("ll:settings:state");

describe("useSettingsStore", () => {
  afterEach(() => {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  });

  it("enables animation effects by default", () => {
    expect(useSettingsStore.getState().animationEffectsEnabled).toBe(true);
  });

  it("toggles animation effects", () => {
    useSettingsStore.getState().toggleAnimationEffects();

    expect(useSettingsStore.getState().animationEffectsEnabled).toBe(false);

    useSettingsStore.getState().toggleAnimationEffects();

    expect(useSettingsStore.getState().animationEffectsEnabled).toBe(true);
  });

  it("persists animation effects in settings storage", () => {
    useSettingsStore.getState().toggleAnimationEffects();

    const storedSettings = JSON.parse(
      localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}",
    ) as {
      state?: {
        animationEffectsEnabled?: boolean;
      };
    };

    expect(storedSettings.state?.animationEffectsEnabled).toBe(false);
  });

  it("uses the first accessible guild when the current selection is missing", () => {
    useSettingsStore
      .getState()
      .ensureGuildId("character-1", ["guild-2", "guild-1"]);

    expect(useSettingsStore.getState().guildIdByCharId).toEqual({
      "character-1": "guild-2",
    });
  });

  it("replaces an inaccessible guild without changing other characters", () => {
    useSettingsStore.setState({
      guildIdByCharId: {
        "character-1": "missing-guild",
        "character-2": "guild-3",
      },
    });

    useSettingsStore
      .getState()
      .ensureGuildId("character-1", ["guild-1", "guild-2"]);

    expect(useSettingsStore.getState().guildIdByCharId).toEqual({
      "character-1": "guild-1",
      "character-2": "guild-3",
    });
  });

  it.each(["all", "guild-2"])(
    "preserves the valid %s selection",
    (selectedGuildId) => {
      useSettingsStore.setState({
        guildIdByCharId: { "character-1": selectedGuildId },
      });

      useSettingsStore
        .getState()
        .ensureGuildId("character-1", ["guild-1", "guild-2"]);

      expect(useSettingsStore.getState().guildIdByCharId["character-1"]).toBe(
        selectedGuildId,
      );
    },
  );

  it("does not create a selection without accessible guilds", () => {
    useSettingsStore.getState().ensureGuildId("character-1", []);

    expect(useSettingsStore.getState().guildIdByCharId).toEqual({});
  });
});
