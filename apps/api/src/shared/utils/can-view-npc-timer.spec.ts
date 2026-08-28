import { Permission } from "src/db/domain";
import {
  canViewNpcTimer,
  type NpcPermissionData,
  type RolePermissionData,
} from "@lootlog/api-helpers/permissions";

function createRole(
  permissions: string[],
  lvlRangeFrom = 1,
  lvlRangeTo = 500,
): RolePermissionData {
  return {
    permissions,
    lvlRangeFrom,
    lvlRangeTo,
  };
}

function createNpc(
  overrides: Partial<NpcPermissionData> = {},
): NpcPermissionData {
  return {
    lvl: 100,
    type: "ELITE2",
    ...overrides,
  };
}

describe("canViewNpcTimer", () => {
  it("returns false when npc data is missing", () => {
    expect(
      canViewNpcTimer(null, [createRole([Permission.LOOTLOG_TIMERS_READ])]),
    ).toBe(false);
  });

  it("allows base timer access when permission and level match", () => {
    const roles = [createRole([Permission.LOOTLOG_TIMERS_READ], 50, 150)];

    expect(canViewNpcTimer(createNpc(), roles)).toBe(true);
  });

  it("requires level range for base timer access", () => {
    const roles = [createRole([Permission.LOOTLOG_TIMERS_READ], 1, 99)];

    expect(canViewNpcTimer(createNpc(), roles)).toBe(false);
  });

  it("requires titan timer permission for titan NPCs", () => {
    const roles = [createRole([Permission.LOOTLOG_TIMERS_READ], 1, 500)];

    expect(canViewNpcTimer(createNpc({ type: "TITAN" }), roles)).toBe(false);
  });

  it("allows titan timer access when permission and level match", () => {
    const roles = [
      createRole([Permission.LOOTLOG_TIMERS_TITANS_READ], 250, 350),
    ];

    expect(canViewNpcTimer(createNpc({ lvl: 300, type: "TITAN" }), roles)).toBe(
      true,
    );
  });

  it("uses hero timer permission for hero and event hero NPCs", () => {
    const roles = [
      createRole([Permission.LOOTLOG_TIMERS_HEROES_READ], 100, 200),
    ];

    expect(canViewNpcTimer(createNpc({ lvl: 150, type: "HERO" }), roles)).toBe(
      true,
    );
    expect(
      canViewNpcTimer(createNpc({ lvl: 150, type: "EVENT_HERO" }), roles),
    ).toBe(true);
  });

  it("does not combine timer permission from one role with level range from another", () => {
    const roles = [
      createRole([Permission.LOOTLOG_TIMERS_TITANS_READ], 1, 299),
      createRole([], 300, 400),
    ];

    expect(canViewNpcTimer(createNpc({ lvl: 300, type: "TITAN" }), roles)).toBe(
      false,
    );
  });
});
