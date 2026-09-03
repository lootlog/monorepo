import { describe, expect, it } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import {
  canViewNpcTimer,
  type NpcPermissionData,
  type RolePermissionData,
} from "./npc-permissions.js";

const role = (
  permissions: string[],
  lvlRangeFrom = 1,
  lvlRangeTo = 500,
): RolePermissionData => ({ permissions, lvlRangeFrom, lvlRangeTo });

const npc = (
  overrides: Partial<NpcPermissionData> = {},
): NpcPermissionData => ({ lvl: 100, type: "ELITE2", ...overrides });

describe("NPC timer permissions", () => {
  it("rejects missing NPC data", () => {
    expect(
      canViewNpcTimer(null, [role([Permission.LOOTLOG_TIMERS_READ])]),
    ).toBe(false);
  });

  it("requires permission and level range on the same role", () => {
    expect(
      canViewNpcTimer(npc({ lvl: 300, type: "TITAN" }), [
        role([Permission.LOOTLOG_TIMERS_TITANS_READ], 1, 299),
        role([], 300, 400),
      ]),
    ).toBe(false);
  });

  it("routes titan and hero tiers to their dedicated permissions", () => {
    expect(
      canViewNpcTimer(npc({ lvl: 300, type: "TITAN" }), [
        role([Permission.LOOTLOG_TIMERS_TITANS_READ], 250, 350),
      ]),
    ).toBe(true);
    expect(
      canViewNpcTimer(npc({ lvl: 150, type: "EVENT_HERO" }), [
        role([Permission.LOOTLOG_TIMERS_HEROES_READ], 100, 200),
      ]),
    ).toBe(true);
  });
});
