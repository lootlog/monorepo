import { describe, expect, it } from "bun:test";
import {
  canViewLoot,
  createLootAccessFingerprint,
  type LootVisibilityRole,
} from "./loot-visibility.js";

const baseRole: LootVisibilityRole = {
  id: "base",
  levelFrom: 1,
  levelTo: 300,
  permissions: ["LOOTLOG_LOOTS_READ"],
};

describe("canViewLoot", () => {
  it("requires every NPC to be covered by one complete role grant", () => {
    const roles: LootVisibilityRole[] = [
      {
        ...baseRole,
        id: "titan-low-level",
        levelTo: 100,
        permissions: ["LOOTLOG_LOOTS_READ", "LOOTLOG_LOOTS_TITANS_READ"],
      },
      {
        ...baseRole,
        id: "high-level-without-titan",
        levelFrom: 101,
      },
    ];

    expect(
      canViewLoot({
        permissions: roles.flatMap((role) => role.permissions),
        roles,
        npcs: [{ type: "TITAN", level: 150 }],
      }),
    ).toBe(false);
  });

  it("supports future mixed-tier loot when every NPC has a complete grant", () => {
    const roles: LootVisibilityRole[] = [
      {
        ...baseRole,
        id: "all-loot-tiers",
        permissions: [
          "LOOTLOG_LOOTS_READ",
          "LOOTLOG_LOOTS_HEROES_READ",
          "LOOTLOG_LOOTS_TITANS_READ",
        ],
      },
    ];

    expect(
      canViewLoot({
        permissions: roles.flatMap((role) => role.permissions),
        roles,
        npcs: [
          { type: "HERO", level: 120 },
          { type: "TITAN", level: 250 },
        ],
      }),
    ).toBe(true);
  });

  it("fails closed for missing NPC facts and does not give ADMIN a bypass", () => {
    expect(
      canViewLoot({
        permissions: ["ADMIN", "LOOTLOG_LOOTS_READ"],
        roles: [baseRole],
        npcs: [{ type: null, level: 100 }],
      }),
    ).toBe(false);
  });

  it("keeps OWNER as the recovery bypass", () => {
    expect(
      canViewLoot({
        permissions: ["OWNER"],
        roles: [],
        npcs: [{ type: null, level: null }],
      }),
    ).toBe(true);
  });
});

describe("createLootAccessFingerprint", () => {
  it("is stable for equivalent permission and role order", () => {
    const left = createLootAccessFingerprint({
      organizationId: "guild-1",
      permissions: ["LOOTLOG_LOOTS_READ", "ADMIN"],
      roles: [
        baseRole,
        { ...baseRole, id: "hero", permissions: ["LOOTLOG_LOOTS_HEROES_READ"] },
      ],
    });
    const right = createLootAccessFingerprint({
      organizationId: "guild-1",
      permissions: ["ADMIN", "LOOTLOG_LOOTS_READ"],
      roles: [
        { ...baseRole, id: "hero", permissions: ["LOOTLOG_LOOTS_HEROES_READ"] },
        baseRole,
      ],
    });

    expect(left).toBe(right);
  });
});
