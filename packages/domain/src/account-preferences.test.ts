import { expect, test } from "bun:test";
import { defaultNotificationsSettings } from "@lootlog/schema/account-preferences";
import {
  normalizeDetector,
  normalizeNotificationMutes,
  normalizeNotifications,
} from "./account-preferences.js";

test("legacy notification fields fall back independently without losing valid preferences", () => {
  const result = normalizeNotifications({
    guildIds: ["guild-1", null, 2, "guild-2"],
    HERO: {
      show: false,
      sound: true,
      highlight: "invalid",
      autoHideTimeout: -1,
    },
    TITAN: null,
  });

  expect(result.guildIds).toEqual(["guild-1", "guild-2"]);
  expect(result.HERO).toEqual({
    ...defaultNotificationsSettings.HERO,
    show: false,
    sound: true,
    ignoreOtherWorlds: false,
  });
  expect(result.TITAN.ignoreOtherWorlds).toBe(false);
  expect(result.COLOSSUS.ignoreOtherWorlds).toBe(true);
  expect(normalizeNotifications(undefined)).toEqual(
    defaultNotificationsSettings,
  );
});

test("malformed mute entries do not discard valid entries or change last-write deduplication", () => {
  const result = normalizeNotificationMutes({
    players: [
      null,
      { discordId: "player", displayName: "old" },
      { discordId: "", displayName: "ignored" },
      { discordId: "player", displayName: 42 },
    ],
    npcs: [
      {
        npcKey: "invalid",
        name: "invalid",
        npcId: 1,
        npcType: "HERO",
        lvl: Number.NaN,
      },
      { npcKey: "npc", name: "Hero", npcId: 2, npcType: "HERO", lvl: 10.9 },
    ],
  });

  expect(result).toEqual({
    players: [{ discordId: "player", displayName: "" }],
    npcs: [
      {
        npcKey: "npc",
        name: "Hero",
        npcId: 2,
        npcType: "HERO",
        lvl: 10,
        prof: null,
        icon: null,
      },
    ],
  });
});

test("routing normalization retains positional identifiers and clamps legacy level bounds", () => {
  const result = normalizeDetector({
    HERO: { detect: false, notifySound: "invalid" },
    routingRules: [
      null,
      { minLevel: Number.NaN, maxLevel: 100 },
      {
        minLevel: Infinity,
        maxLevel: -Infinity,
        name: " Hero ",
        world: "  ",
        guildIds: [1, "guild"],
      },
    ],
  });

  expect(result.HERO.detect).toBe(false);
  expect(result.HERO.notifySound).toBe(false);
  expect(result.routingRules).toEqual([
    {
      id: "rule-3",
      minLevel: 0,
      maxLevel: 500,
      name: "Hero",
      guildIds: ["guild"],
    },
  ]);
});
