import { describe, expect, it } from "bun:test";
import { Capability } from "@lootlog/schema/permissions";
import {
  canReadHeroSighting,
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
      canViewNpcTimer(null, [role([Capability.LOOTLOG_TIMERS_READ])]),
    ).toBe(false);
  });

  it("grants base timer access only inside the role level range", () => {
    expect(
      canViewNpcTimer(npc(), [role([Capability.LOOTLOG_TIMERS_READ], 50, 150)]),
    ).toBe(true);
    expect(
      canViewNpcTimer(npc(), [role([Capability.LOOTLOG_TIMERS_READ], 1, 99)]),
    ).toBe(false);
  });

  it("does not grant titan timers through the base timer permission", () => {
    expect(
      canViewNpcTimer(npc({ type: "TITAN" }), [
        role([Capability.LOOTLOG_TIMERS_READ]),
      ]),
    ).toBe(false);
  });

  it("requires permission and level range on the same role", () => {
    expect(
      canViewNpcTimer(npc({ lvl: 300, type: "TITAN" }), [
        role([Capability.LOOTLOG_TIMERS_TITANS_READ], 1, 299),
        role([], 300, 400),
      ]),
    ).toBe(false);
  });

  it("routes titan and hero tiers to their dedicated permissions", () => {
    expect(
      canViewNpcTimer(npc({ lvl: 300, type: "TITAN" }), [
        role([Capability.LOOTLOG_TIMERS_TITANS_READ], 250, 350),
      ]),
    ).toBe(true);

    for (const type of ["HERO", "EVENT_HERO"] as const) {
      expect(
        canViewNpcTimer(npc({ lvl: 150, type }), [
          role([Capability.LOOTLOG_TIMERS_HEROES_READ], 100, 200),
        ]),
      ).toBe(true);
    }
  });
});

describe("hero sighting permissions", () => {
  it("does not grant sightings through hero timer access", () => {
    expect(
      canReadHeroSighting(
        [
          role([
            Capability.LOOTLOG_TIMERS_READ,
            Capability.LOOTLOG_TIMERS_HEROES_READ,
          ]),
        ],
        150,
      ),
    ).toBe(false);
  });

  it("grants sightings only inside the level range of the role holding the capability", () => {
    const roles = [
      role([Capability.LOOTLOG_HERO_SIGHTINGS_READ], 100, 200),
      role([], 1, 500),
    ];

    expect(canReadHeroSighting(roles, 150)).toBe(true);
    expect(canReadHeroSighting(roles, 250)).toBe(false);
  });
});
