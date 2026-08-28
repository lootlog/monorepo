import { applySettingsPatch, resolveSettingsDomain } from "./settings-resolver";
import {
  CHAT_APPEARANCE_READABLE_PRESET,
  migrateSettingsDocument,
  SETTINGS_CATALOG,
  SETTINGS_DOMAINS,
  THEME_PRESET_IDS,
} from "@lootlog/types";
import { describe, expect, it } from "vitest";

describe("settings resolver", () => {
  it("has valid defaults and exactly one inheritance path for every field", () => {
    for (const domain of SETTINGS_DOMAINS) {
      const definition = SETTINGS_CATALOG[domain];

      for (const fieldDefinition of Object.values(definition.fields)) {
        expect(fieldDefinition.isValid(fieldDefinition.defaultValue)).toBe(
          true,
        );
        expect(fieldDefinition.scopes[0]).toBe("USER");

        const usesCharacterPath = fieldDefinition.scopes.includes("CHARACTER");
        const usesGuildPath = fieldDefinition.scopes.includes("GUILD");
        expect(usesCharacterPath && usesGuildPath).toBe(false);
      }
    }
  });

  it("keeps every chat appearance field global to the user", () => {
    const chatFields = Object.entries(
      SETTINGS_CATALOG.appearance.fields,
    ).filter(([path]) => path.startsWith("chat."));

    expect(chatFields.length).toBeGreaterThan(0);
    for (const [, definition] of chatFields) {
      expect(definition.scopes).toEqual(["USER"]);
    }
  });

  it("removes obsolete color mode and migrates a legacy theme to v4", () => {
    expect(
      migrateSettingsDocument(
        "appearance",
        {
          theme: "default",
          colorMode: "light",
          chat: {
            fontScalePercent: 110,
          },
        },
        2,
      ),
    ).toEqual({
      theme: {
        revision: 1,
        selection: { kind: "preset", presetId: "default" },
        customThemes: [],
        specialOverrides: {},
      },
      chat: {
        fontScalePercent: 110,
      },
    });
    expect(SETTINGS_CATALOG.appearance.schemaVersion).toBe(4);
  });

  it.each(THEME_PRESET_IDS)("migrates the legacy %s theme ID", (presetId) => {
    expect(
      migrateSettingsDocument("appearance", { theme: presetId }, 3),
    ).toMatchObject({
      theme: {
        selection: { kind: "preset", presetId },
      },
    });
  });

  it("keeps chat values on the user layer while ignoring lower scopes", () => {
    const resolution = resolveSettingsDomain("appearance", [
      {
        scope: { type: "USER", id: "user-1" },
        overrides: {
          chat: {
            fontScalePercent: 110,
            showTimestamp: false,
          },
        },
      },
      {
        scope: { type: "GAME_ACCOUNT", id: "account-1" },
        overrides: {
          chat: {
            fontScalePercent: 90,
          },
        },
      },
      {
        scope: { type: "CHARACTER", id: "character-1" },
        overrides: {
          chat: {
            messageGapPx: 8,
          },
        },
      },
    ]);

    expect(resolution.effective).toMatchObject({
      chat: {
        fontScalePercent: 110,
        messageGapPx: CHAT_APPEARANCE_READABLE_PRESET.messageGapPx,
        showTimestamp: false,
      },
    });
    expect(resolution.sources).toMatchObject({
      "chat.fontScalePercent": {
        type: "USER",
        id: "user-1",
      },
      "chat.messageGapPx": "DEFAULT",
      "chat.showTimestamp": {
        type: "USER",
        id: "user-1",
      },
      "chat.npcLayout": "DEFAULT",
    });
  });

  it("creates and removes field overrides without changing sibling values", () => {
    const withOverride = applySettingsPatch({
      domain: "appearance",
      scope: { type: "USER", id: "user-1" },
      currentOverrides: {
        chat: {
          showTimestamp: false,
        },
      },
      set: {
        chat: {
          fontScalePercent: 125,
        },
      },
      unset: [],
    });

    expect(withOverride).toEqual({
      chat: {
        showTimestamp: false,
        fontScalePercent: 125,
      },
    });

    expect(
      applySettingsPatch({
        domain: "appearance",
        scope: { type: "USER", id: "user-1" },
        currentOverrides: withOverride,
        set: {},
        unset: ["chat.fontScalePercent"],
      }),
    ).toEqual({
      chat: {
        showTimestamp: false,
      },
    });
  });

  it("replaces arrays and ignores malformed stored values", () => {
    const patched = applySettingsPatch({
      domain: "timers",
      scope: { type: "GUILD", id: "guild-1" },
      currentOverrides: {
        hiddenTimers: ["timer-1"],
      },
      set: {
        hiddenTimers: ["timer-2"],
      },
      unset: [],
    });

    expect(patched.hiddenTimers).toEqual(["timer-2"]);
    expect(
      resolveSettingsDomain("appearance", [
        {
          scope: { type: "USER", id: "user-1" },
          overrides: { chat: { fontScalePercent: "broken" } },
        },
      ]).effective,
    ).toMatchObject({
      chat: {
        fontScalePercent: 100,
      },
    });
  });

  it("recursively merges object settings registered at their root path", () => {
    expect(
      applySettingsPatch({
        domain: "timers",
        scope: { type: "USER", id: "user-1" },
        currentOverrides: {
          generalConfig: {
            countdownMode: "max",
            timersGrouping: false,
          },
        },
        set: {
          generalConfig: {
            timersGrouping: true,
          },
        },
        unset: [],
      }),
    ).toEqual({
      generalConfig: {
        countdownMode: "max",
        timersGrouping: true,
      },
    });
  });

  it("rejects ambiguous and out-of-scope patches", () => {
    expect(() =>
      applySettingsPatch({
        domain: "appearance",
        scope: { type: "GUILD", id: "guild-1" },
        currentOverrides: {},
        set: {
          chat: {
            fontScalePercent: 120,
          },
        },
        unset: [],
      }),
    ).toThrow(/scope/i);

    expect(() =>
      applySettingsPatch({
        domain: "appearance",
        scope: { type: "GAME_ACCOUNT", id: "account-1" },
        currentOverrides: {},
        set: {
          chat: {
            fontScalePercent: 120,
          },
        },
        unset: [],
      }),
    ).toThrow(/scope/i);

    expect(() =>
      applySettingsPatch({
        domain: "appearance",
        scope: { type: "USER", id: "user-1" },
        currentOverrides: {},
        set: {
          chat: {
            fontScalePercent: 120,
          },
        },
        unset: ["chat.fontScalePercent"],
      }),
    ).toThrow(/set.*unset/i);
  });
});
