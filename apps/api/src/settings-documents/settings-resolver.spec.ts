import { applySettingsPatch, resolveSettingsDomain } from "./settings-resolver";
import { SETTINGS_CATALOG, SETTINGS_DOMAINS } from "@lootlog/types";
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

  it("resolves appearance values through the declared scope path", () => {
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
        fontScalePercent: 90,
        messageGapPx: 8,
        showTimestamp: false,
      },
    });
    expect(resolution.sources).toMatchObject({
      "chat.fontScalePercent": {
        type: "GAME_ACCOUNT",
        id: "account-1",
      },
      "chat.messageGapPx": {
        type: "CHARACTER",
        id: "character-1",
      },
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
      scope: { type: "GAME_ACCOUNT", id: "account-1" },
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
        scope: { type: "GAME_ACCOUNT", id: "account-1" },
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
