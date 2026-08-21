import { NpcType, Permission } from "src/generated/prisma/client";
import {
  buildNpcSnapshotVisibilityWhere,
  buildNpcVisibilitySqlCondition,
  canViewStrategicNpc,
  createStrategicAccessContext,
  LOOT_VISIBILITY_PERMISSIONS,
} from "./strategic-access-policy";

const createRole = (options?: {
  permissions?: Permission[];
  lvlRangeFrom?: number | null;
  lvlRangeTo?: number | null;
}) => ({
  permissions: options?.permissions ?? [Permission.LOOTLOG_LOOTS_READ],
  lvlRangeFrom: options?.lvlRangeFrom ?? 1,
  lvlRangeTo: options?.lvlRangeTo ?? 500,
});

describe("strategic access policy adapter", () => {
  it("derives owner authority from identity instead of expanded permissions", () => {
    const administrator = createStrategicAccessContext({
      organizationId: "guild-1",
      ownerId: "owner",
      viewerDiscordId: "administrator",
      roles: [createRole({ permissions: [Permission.ADMIN] })],
    });
    const owner = createStrategicAccessContext({
      organizationId: "guild-1",
      ownerId: "owner",
      viewerDiscordId: "owner",
      roles: [],
    });
    const titan = {
      organizationId: "guild-1",
      world: "Aether",
      npc: {
        id: 100,
        type: NpcType.TITAN,
        group: null,
        level: 300,
      },
    };

    expect(
      canViewStrategicNpc(administrator, titan, LOOT_VISIBILITY_PERMISSIONS),
    ).toBe(false);
    expect(canViewStrategicNpc(owner, titan, LOOT_VISIBILITY_PERMISSIONS)).toBe(
      true,
    );
  });

  it("builds the same role-local level and tier restrictions for Prisma", () => {
    const context = createStrategicAccessContext({
      organizationId: "guild-1",
      ownerId: "owner",
      viewerDiscordId: "member",
      roles: [
        createRole({
          permissions: [
            Permission.LOOTLOG_LOOTS_READ,
            Permission.LOOTLOG_LOOTS_TITANS_READ,
          ],
          lvlRangeFrom: 250,
          lvlRangeTo: 350,
        }),
      ],
    });

    expect(
      buildNpcSnapshotVisibilityWhere(context, LOOT_VISIBILITY_PERMISSIONS),
    ).toEqual({
      OR: [
        {
          AND: [
            { lvl: { gte: 250, lte: 350 } },
            { type: { notIn: [NpcType.HERO, NpcType.EVENT_HERO] } },
          ],
        },
      ],
    });
  });

  it("keeps an action permission on the same matching role", () => {
    const context = createStrategicAccessContext({
      organizationId: "guild-1",
      ownerId: "owner",
      viewerDiscordId: "member",
      roles: [
        createRole({ permissions: [Permission.LOOTLOG_LOOTS_READ] }),
        createRole({ permissions: [Permission.LOOTLOG_MANAGE] }),
      ],
    });

    expect(
      buildNpcSnapshotVisibilityWhere(
        context,
        LOOT_VISIBILITY_PERMISSIONS,
        Permission.LOOTLOG_MANAGE,
      ),
    ).toEqual({ OR: [] });
  });

  it("parameterizes level ranges in the raw SQL condition", () => {
    const context = createStrategicAccessContext({
      organizationId: "guild-1",
      ownerId: "owner",
      viewerDiscordId: "member",
      roles: [
        createRole({
          permissions: [Permission.LOOTLOG_LOOTS_READ],
          lvlRangeFrom: 10,
          lvlRangeTo: 60,
        }),
      ],
    });

    expect(
      buildNpcVisibilitySqlCondition(
        context,
        LOOT_VISIBILITY_PERMISSIONS,
        "ns",
        4,
      ),
    ).toEqual({
      sql: "AND ((ns.lvl BETWEEN $4 AND $5 AND ns.type NOT IN ('TITAN', 'HERO', 'EVENT_HERO')))",
      params: [10, 60],
    });
  });
});
