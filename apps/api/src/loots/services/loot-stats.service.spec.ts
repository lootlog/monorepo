import type { Mock } from "vitest";
import {
  NpcType,
  Permission,
  type Guild,
  type Role,
} from "src/generated/prisma/client";
import { LootStatsService } from "./loot-stats.service";

const guild = {
  id: "guild-1",
  ownerId: "owner",
} as Guild;

const createRole = (permissions: Permission[]): Role =>
  ({
    id: "role-1",
    guildId: guild.id,
    permissions,
    lvlRangeFrom: 10,
    lvlRangeTo: 60,
  }) as Role;

describe("LootStatsService strategic visibility", () => {
  let queryRawUnsafe: Mock;
  let service: LootStatsService;

  beforeEach(() => {
    queryRawUnsafe = vi
      .fn<() => Promise<unknown[]>>()
      .mockResolvedValueOnce([
        {
          total_loots: 0n,
          total_items: 0n,
          legendary_items: 0n,
          heroic_items: 0n,
          avg_item_level: null,
        },
      ])
      .mockResolvedValue([]);
    const redis = {
      getJson: vi.fn<() => Promise<null>>().mockResolvedValue(null),
      getOrSetJson: vi
        .fn<
          (options: { factory: () => Promise<unknown> }) => Promise<unknown>
        >()
        .mockImplementation((options) => options.factory()),
      deleteByPattern: vi.fn<() => Promise<number>>().mockResolvedValue(0),
    };

    service = new LootStatsService(
      { $queryRawUnsafe: queryRawUnsafe } as never,
      redis as never,
    );
  });

  it("applies the same parameterized level and tier predicate to every aggregate", async () => {
    await service.getLootStats(
      guild,
      "member",
      [createRole([Permission.LOOTLOG_LOOTS_READ])],
      "all",
    );

    expect(queryRawUnsafe).toHaveBeenCalledTimes(6);
    for (const [query, guildId, levelFrom, levelTo] of queryRawUnsafe.mock
      .calls) {
      expect(query).toContain(
        "AND ((ns.lvl BETWEEN $2 AND $3 AND ns.type NOT IN ('TITAN', 'HERO', 'EVENT_HERO')))",
      );
      expect([guildId, levelFrom, levelTo]).toEqual([guild.id, 10, 60]);
    }
  });

  it("does not treat an administrator role as strategic data visibility", async () => {
    await service.getLootStats(
      guild,
      "administrator",
      [createRole([Permission.ADMIN])],
      "all",
      undefined,
      [NpcType.TITAN],
    );

    expect(queryRawUnsafe).toHaveBeenCalledTimes(6);
    for (const [query] of queryRawUnsafe.mock.calls) {
      expect(query).toContain("AND FALSE");
    }
  });
});
