import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import { NpcType, type ItemRarity } from "src/db/domain";
import { rawTextArray, rawTimestamp } from "src/db/raw-values";
import type {
  Period,
  LootStatsResponse,
  LootStatsOverview,
  RarityStats,
  TimelinePoint,
  TopNpc,
  TopContributor,
  TopItem,
} from "../dto/loot-stats.dto";

const CACHE_TTL_SECONDS = 60;

@Injectable()
export class LootStatsService {
  private readonly logger = new Logger(LootStatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async invalidateCache(guildIds: string[]) {
    const uniqueGuildIds = [...new Set(guildIds)];

    await Promise.all(
      uniqueGuildIds.map(async (guildId) => {
        try {
          await this.redis.deleteByPattern(`loot-stats:${guildId}:*`);
        } catch (error) {
          this.logger.warn("Failed to invalidate loot stats cache", {
            error,
            guildId,
          });
        }
      }),
    );
  }

  async getLootStats(
    guildId: string,
    period: Period = "7d",
    world?: string,
    npcTypes?: string[],
    excludeColossus?: boolean,
  ): Promise<LootStatsResponse> {
    const cacheKey = this.buildCacheKey(
      guildId,
      period,
      world,
      npcTypes,
      excludeColossus,
    );

    const cached = await this.redis.getJson<LootStatsResponse>(cacheKey);
    if (cached !== null) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Cache miss for ${cacheKey}`);

    return this.redis.getOrSetJson({
      key: cacheKey,
      ttlSeconds: CACHE_TTL_SECONDS,
      factory: async () => {
        const dateFrom = this.getDateFromPeriod(period);
        const npcTypeFilter = npcTypes?.length
          ? npcTypes.filter((t): t is NpcType =>
              Object.values(NpcType).includes(t as NpcType),
            )
          : undefined;

        const [
          overview,
          byRarity,
          timeline,
          topNpcs,
          topContributors,
          topItems,
        ] = await Promise.all([
          this.getOverview(
            guildId,
            dateFrom,
            world,
            npcTypeFilter,
            excludeColossus,
          ),
          this.getByRarity(
            guildId,
            dateFrom,
            world,
            npcTypeFilter,
            excludeColossus,
          ),
          this.getTimeline(
            guildId,
            dateFrom,
            period,
            world,
            npcTypeFilter,
            excludeColossus,
          ),
          this.getTopNpcs(
            guildId,
            dateFrom,
            world,
            npcTypeFilter,
            excludeColossus,
          ),
          this.getTopContributors(
            guildId,
            dateFrom,
            world,
            npcTypeFilter,
            excludeColossus,
          ),
          this.getTopLegendaryItems(
            guildId,
            dateFrom,
            world,
            npcTypeFilter,
            excludeColossus,
          ),
        ]);

        return {
          overview,
          byRarity,
          timeline,
          topNpcs,
          topContributors,
          topItems,
        };
      },
    });
  }

  private buildCacheKey(
    guildId: string,
    period: Period,
    world?: string,
    npcTypes?: string[],
    excludeColossus?: boolean,
  ): string {
    const parts = ["loot-stats", guildId, period];
    if (world) parts.push(world);
    if (npcTypes?.length) parts.push(npcTypes.sort().join(","));
    if (excludeColossus) parts.push("no-colossus");
    return parts.join(":");
  }

  private getDateFromPeriod(period: Period): Date | null {
    if (period === "all") return null;

    const now = new Date();
    const periodMap: Record<Exclude<Period, "all">, number> = {
      "24h": 1,
      "3d": 3,
      "7d": 7,
      "14d": 14,
      "30d": 30,
      "90d": 90,
      "180d": 180,
    };

    const days = periodMap[period];
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  private async getOverview(
    guildId: string,
    dateFrom: Date | null,
    world?: string,
    npcTypes?: NpcType[],
    excludeColossus?: boolean,
  ): Promise<LootStatsOverview> {
    const needsNpcFilter = !!(npcTypes?.length || excludeColossus);
    const minimumDate = dateFrom ?? new Date(0);
    const filteredNpcTypes = npcTypes ?? [];
    const plan = needsNpcFilter
      ? this.prisma.raw.sql`
        WITH valid_loots AS (
          SELECT DISTINCT l.id as loot_id
          FROM "Loot" l
          INNER JOIN "LootSubmission" ls ON ls."lootId" = l.id
          INNER JOIN "LootNpc" ln ON ln."lootId" = l.id
          INNER JOIN "NpcSnapshot" ns ON ns.id = ln."npcSnapshotId"
          WHERE ls."guildId" = ${guildId}
            AND ns.type != 'COMMON'
            AND (${dateFrom === null} OR l."createdAt" >= ${rawTimestamp(minimumDate)})
            AND (${!world} OR l.world = ${world ?? ""})
            AND (${filteredNpcTypes.length === 0} OR ns.type::text = ANY(${rawTextArray(filteredNpcTypes)}::text[]))
            AND (${!excludeColossus} OR ns.type != 'COLOSSUS')
        )
        SELECT
          COUNT(DISTINCT l.id) as total_loots,
          COUNT(li.id) as total_items,
          COUNT(li.id) FILTER (WHERE isnap.rarity = 'LEGENDARY') as legendary_items,
          COUNT(li.id) FILTER (WHERE isnap.rarity = 'HEROIC') as heroic_items,
          AVG(isnap.lvl)::float8 as avg_item_level
        FROM valid_loots vl
        INNER JOIN "Loot" l ON l.id = vl.loot_id
        INNER JOIN "LootItem" li ON li."lootId" = l.id
        INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
      `
      : this.prisma.raw.sql`
        SELECT
          COUNT(DISTINCT l.id) as total_loots,
          COUNT(li.id) as total_items,
          COUNT(li.id) FILTER (WHERE isnap.rarity = 'LEGENDARY') as legendary_items,
          COUNT(li.id) FILTER (WHERE isnap.rarity = 'HEROIC') as heroic_items,
          AVG(isnap.lvl)::float8 as avg_item_level
        FROM "Loot" l
        INNER JOIN "LootSubmission" ls ON ls."lootId" = l.id
        INNER JOIN "LootItem" li ON li."lootId" = l.id
        INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
        WHERE ls."guildId" = ${guildId}
          AND (${dateFrom === null} OR l."createdAt" >= ${rawTimestamp(minimumDate)})
          AND (${!world} OR l.world = ${world ?? ""})
      `;
    const result = await this.prisma.query<{
      total_loots: bigint;
      total_items: bigint;
      legendary_items: bigint;
      heroic_items: bigint;
      avg_item_level: number | null;
    }>(
      plan
        .returnsRow({
          total_loots: "pg/int8@1",
          total_items: "pg/int8@1",
          legendary_items: "pg/int8@1",
          heroic_items: "pg/int8@1",
          avg_item_level: { codecId: "pg/float8@1", nullable: true },
        })
        .build(),
    );

    const row = result[0];
    return {
      totalLoots: Number(row?.total_loots ?? 0),
      totalItems: Number(row?.total_items ?? 0),
      legendaryItems: Number(row?.legendary_items ?? 0),
      heroicItems: Number(row?.heroic_items ?? 0),
      avgItemLevel: row?.avg_item_level
        ? Math.round(Number(row.avg_item_level))
        : 0,
    };
  }

  private async getByRarity(
    guildId: string,
    dateFrom: Date | null,
    world?: string,
    npcTypes?: NpcType[],
    excludeColossus?: boolean,
  ): Promise<Partial<Record<ItemRarity, RarityStats>>> {
    const needsNpcFilter = !!(npcTypes?.length || excludeColossus);
    const minimumDate = dateFrom ?? new Date(0);
    const filteredNpcTypes = npcTypes ?? [];
    const plan = needsNpcFilter
      ? this.prisma.raw.sql`
        WITH valid_loots AS (
          SELECT DISTINCT l.id as loot_id
          FROM "Loot" l
          INNER JOIN "LootSubmission" ls ON ls."lootId" = l.id
          INNER JOIN "LootNpc" ln ON ln."lootId" = l.id
          INNER JOIN "NpcSnapshot" ns ON ns.id = ln."npcSnapshotId"
          WHERE ls."guildId" = ${guildId}
            AND ns.type != 'COMMON'
            AND (${dateFrom === null} OR l."createdAt" >= ${rawTimestamp(minimumDate)})
            AND (${!world} OR l.world = ${world ?? ""})
            AND (${filteredNpcTypes.length === 0} OR ns.type::text = ANY(${rawTextArray(filteredNpcTypes)}::text[]))
            AND (${!excludeColossus} OR ns.type != 'COLOSSUS')
        )
        SELECT
          isnap.rarity::text AS rarity,
          COUNT(*) as count
        FROM valid_loots vl
        INNER JOIN "Loot" l ON l.id = vl.loot_id
        INNER JOIN "LootItem" li ON li."lootId" = l.id
        INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
        WHERE isnap.rarity IS NOT NULL
        GROUP BY isnap.rarity
      `
      : this.prisma.raw.sql`
        SELECT
          isnap.rarity::text AS rarity,
          COUNT(*) as count
        FROM "Loot" l
        INNER JOIN "LootSubmission" ls ON ls."lootId" = l.id
        INNER JOIN "LootItem" li ON li."lootId" = l.id
        INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
        WHERE ls."guildId" = ${guildId}
          AND isnap.rarity IS NOT NULL
          AND (${dateFrom === null} OR l."createdAt" >= ${rawTimestamp(minimumDate)})
          AND (${!world} OR l.world = ${world ?? ""})
        GROUP BY isnap.rarity
      `;
    const result = await this.prisma.query<{
      rarity: ItemRarity;
      count: bigint;
    }>(plan.returnsRow({ rarity: "pg/text@1", count: "pg/int8@1" }).build());

    const total = result.reduce((sum, r) => sum + Number(r.count), 0);
    const byRarity: Partial<Record<ItemRarity, RarityStats>> = {};

    for (const row of result) {
      const count = Number(row.count);
      byRarity[row.rarity] = {
        count,
        percentage: total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0,
      };
    }

    return byRarity;
  }

  private async getTimeline(
    guildId: string,
    dateFrom: Date | null,
    period: Period,
    world?: string,
    npcTypes?: NpcType[],
    excludeColossus?: boolean,
  ): Promise<TimelinePoint[]> {
    const needsNpcFilter = !!(npcTypes?.length || excludeColossus);
    const truncUnit = this.getTimelineTruncUnit(period);
    const minimumDate = dateFrom ?? new Date(0);
    const filteredNpcTypes = npcTypes ?? [];
    const plan = needsNpcFilter
      ? this.prisma.raw.sql`
        WITH valid_loots AS (
          SELECT DISTINCT l.id as loot_id, l."createdAt"
          FROM "Loot" l
          INNER JOIN "LootSubmission" ls ON ls."lootId" = l.id
          INNER JOIN "LootNpc" ln ON ln."lootId" = l.id
          INNER JOIN "NpcSnapshot" ns ON ns.id = ln."npcSnapshotId"
          WHERE ls."guildId" = ${guildId}
            AND ns.type != 'COMMON'
            AND (${dateFrom === null} OR l."createdAt" >= ${rawTimestamp(minimumDate)})
            AND (${!world} OR l.world = ${world ?? ""})
            AND (${filteredNpcTypes.length === 0} OR ns.type::text = ANY(${rawTextArray(filteredNpcTypes)}::text[]))
            AND (${!excludeColossus} OR ns.type != 'COLOSSUS')
        )
        SELECT
          date_trunc(${truncUnit}, vl."createdAt") as date,
          isnap.rarity::text AS rarity,
          COUNT(*) as count
        FROM valid_loots vl
        INNER JOIN "LootItem" li ON li."lootId" = vl.loot_id
        INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
        GROUP BY 1, 2
        ORDER BY date ASC
      `
      : this.prisma.raw.sql`
        SELECT
          date_trunc(${truncUnit}, l."createdAt") as date,
          isnap.rarity::text AS rarity,
          COUNT(*) as count
        FROM "Loot" l
        INNER JOIN "LootSubmission" ls ON ls."lootId" = l.id
        INNER JOIN "LootItem" li ON li."lootId" = l.id
        INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
        WHERE ls."guildId" = ${guildId}
          AND (${dateFrom === null} OR l."createdAt" >= ${rawTimestamp(minimumDate)})
          AND (${!world} OR l.world = ${world ?? ""})
        GROUP BY 1, 2
        ORDER BY date ASC
      `;
    const result = await this.prisma.query<{
      date: Date;
      rarity: ItemRarity | null;
      count: bigint;
    }>(
      plan
        .returnsRow({
          date: "pg/timestamp-temporal@1",
          rarity: { codecId: "pg/text@1", nullable: true },
          count: "pg/int8@1",
        })
        .build(),
    );

    const timelineMap = new Map<
      string,
      { total: number; byRarity: Partial<Record<ItemRarity, number>> }
    >();

    for (const row of result) {
      const dateStr = row.date.toISOString();
      if (!timelineMap.has(dateStr)) {
        timelineMap.set(dateStr, { total: 0, byRarity: {} });
      }

      const entry = timelineMap.get(dateStr);
      if (!entry) {
        continue;
      }
      const count = Number(row.count);
      entry.total += count;
      if (row.rarity) {
        entry.byRarity[row.rarity] = (entry.byRarity[row.rarity] ?? 0) + count;
      }
    }

    return Array.from(timelineMap.entries()).map(([date, data]) => ({
      date,
      total: data.total,
      byRarity: data.byRarity,
    }));
  }

  private getTimelineTruncUnit(period: Period): string {
    switch (period) {
      case "24h":
      case "3d":
        return "hour";
      case "7d":
      case "14d":
      case "30d":
        return "day";
      case "90d":
      case "180d":
      case "all":
        return "week";
      default:
        return "day";
    }
  }

  private async getTopNpcs(
    guildId: string,
    dateFrom: Date | null,
    world?: string,
    npcTypes?: NpcType[],
    excludeColossus?: boolean,
    limit = 10,
  ): Promise<TopNpc[]> {
    const minimumDate = dateFrom ?? new Date(0);
    const filteredNpcTypes = npcTypes ?? [];
    const plan = this.prisma.raw.sql`
      WITH ranked_npcs AS (
        SELECT
          l.id as loot_id,
          ns."npcId",
          ns.name,
          ns.type,
          ns.lvl,
          ns.icon,
          ROW_NUMBER() OVER (
            PARTITION BY l.id
            ORDER BY
              CASE ns.type
                WHEN 'TITAN' THEN 1
                WHEN 'COLOSSUS' THEN 2
                WHEN 'HERO' THEN 3
                WHEN 'EVENT_HERO' THEN 4
                WHEN 'ELITE3' THEN 5
                WHEN 'ELITE2' THEN 6
                WHEN 'ELITE' THEN 7
                ELSE 8
              END
          ) as rn
        FROM "Loot" l
        INNER JOIN "LootSubmission" ls ON ls."lootId" = l.id
        INNER JOIN "LootNpc" ln ON ln."lootId" = l.id
        INNER JOIN "NpcSnapshot" ns ON ns.id = ln."npcSnapshotId"
        WHERE ls."guildId" = ${guildId}
          AND ns.type != 'COMMON'
          AND (${dateFrom === null} OR l."createdAt" >= ${rawTimestamp(minimumDate)})
          AND (${!world} OR l.world = ${world ?? ""})
          AND (${filteredNpcTypes.length === 0} OR ns.type::text = ANY(${rawTextArray(filteredNpcTypes)}::text[]))
          AND (${!excludeColossus} OR ns.type != 'COLOSSUS')
      )
      SELECT
        rn."npcId" as npc_id,
        rn.name,
        rn.type::text AS type,
        rn.lvl,
        rn.icon,
        COUNT(li.id) as count,
        COUNT(li.id) FILTER (WHERE isnap.rarity = 'LEGENDARY') as legendary,
        COUNT(li.id) FILTER (WHERE isnap.rarity = 'HEROIC') as heroic
      FROM ranked_npcs rn
      INNER JOIN "Loot" l ON l.id = rn.loot_id
      INNER JOIN "LootItem" li ON li."lootId" = l.id
      INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
      WHERE rn.rn = 1
        AND isnap.rarity IN ('LEGENDARY', 'HEROIC')
      GROUP BY rn."npcId", rn.name, rn.type, rn.lvl, rn.icon
      ORDER BY legendary DESC, count DESC
      LIMIT ${limit}
    `;
    const result = await this.prisma.query<{
      npc_id: number;
      name: string;
      type: NpcType | null;
      lvl: number | null;
      icon: string | null;
      count: bigint;
      legendary: bigint;
      heroic: bigint;
    }>(
      plan
        .returnsRow({
          npc_id: "pg/int4@1",
          name: "pg/text@1",
          type: { codecId: "pg/text@1", nullable: true },
          lvl: { codecId: "pg/int4@1", nullable: true },
          icon: { codecId: "pg/text@1", nullable: true },
          count: "pg/int8@1",
          legendary: "pg/int8@1",
          heroic: "pg/int8@1",
        })
        .build(),
    );

    return result.map((row) => ({
      npcId: row.npc_id,
      name: row.name,
      type: row.type,
      lvl: row.lvl,
      icon: row.icon,
      count: Number(row.count),
      byRarity: {
        LEGENDARY: Number(row.legendary),
        HEROIC: Number(row.heroic),
      },
    }));
  }

  private async getTopContributors(
    guildId: string,
    dateFrom: Date | null,
    world?: string,
    npcTypes?: NpcType[],
    excludeColossus?: boolean,
    limit = 10,
  ): Promise<TopContributor[]> {
    const needsNpcFilter = !!(npcTypes?.length || excludeColossus);
    const minimumDate = dateFrom ?? new Date(0);
    const filteredNpcTypes = npcTypes ?? [];
    const plan = needsNpcFilter
      ? this.prisma.raw.sql`
        WITH valid_loots AS (
          SELECT DISTINCT l.id as loot_id
          FROM "Loot" l
          INNER JOIN "LootSubmission" ls ON ls."lootId" = l.id
          INNER JOIN "LootNpc" ln ON ln."lootId" = l.id
          INNER JOIN "NpcSnapshot" ns ON ns.id = ln."npcSnapshotId"
          WHERE ls."guildId" = ${guildId}
            AND ns.type != 'COMMON'
            AND (${dateFrom === null} OR l."createdAt" >= ${rawTimestamp(minimumDate)})
            AND (${!world} OR l.world = ${world ?? ""})
            AND (${filteredNpcTypes.length === 0} OR ns.type::text = ANY(${rawTextArray(filteredNpcTypes)}::text[]))
            AND (${!excludeColossus} OR ns.type != 'COLOSSUS')
        )
        SELECT
          m.id as member_id,
          m.name,
          m.avatar,
          m."userId" as user_id,
          COUNT(DISTINCT l.id) as count,
          COUNT(DISTINCT l.id) FILTER (WHERE isnap.rarity = 'LEGENDARY') as legendary,
          COUNT(DISTINCT l.id) FILTER (WHERE isnap.rarity = 'HEROIC') as heroic,
          COUNT(DISTINCT l.id) FILTER (WHERE isnap.rarity = 'UNIQUE') as unique,
          COUNT(DISTINCT l.id) FILTER (WHERE isnap.rarity = 'UPGRADED') as upgraded
        FROM valid_loots vl
        INNER JOIN "Loot" l ON l.id = vl.loot_id
        INNER JOIN "LootSubmission" ls ON ls."lootId" = l.id
        INNER JOIN "Member" m ON m.id = ls."memberId"
        INNER JOIN "LootItem" li ON li."lootId" = l.id
        INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
        WHERE ls."guildId" = ${guildId}
        GROUP BY m.id, m.name, m.avatar, m."userId"
        ORDER BY count DESC
        LIMIT ${limit}
      `
      : this.prisma.raw.sql`
        SELECT
          m.id as member_id,
          m.name,
          m.avatar,
          m."userId" as user_id,
          COUNT(DISTINCT l.id) as count,
          COUNT(DISTINCT l.id) FILTER (WHERE isnap.rarity = 'LEGENDARY') as legendary,
          COUNT(DISTINCT l.id) FILTER (WHERE isnap.rarity = 'HEROIC') as heroic,
          COUNT(DISTINCT l.id) FILTER (WHERE isnap.rarity = 'UNIQUE') as unique,
          COUNT(DISTINCT l.id) FILTER (WHERE isnap.rarity = 'UPGRADED') as upgraded
        FROM "Loot" l
        INNER JOIN "LootSubmission" ls ON ls."lootId" = l.id
        INNER JOIN "Member" m ON m.id = ls."memberId"
        INNER JOIN "LootItem" li ON li."lootId" = l.id
        INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
        WHERE ls."guildId" = ${guildId}
          AND (${dateFrom === null} OR l."createdAt" >= ${rawTimestamp(minimumDate)})
          AND (${!world} OR l.world = ${world ?? ""})
        GROUP BY m.id, m.name, m.avatar, m."userId"
        ORDER BY count DESC
        LIMIT ${limit}
      `;
    const result = await this.prisma.query<{
      member_id: number;
      name: string;
      avatar: string | null;
      user_id: string;
      count: bigint;
      legendary: bigint;
      heroic: bigint;
      unique: bigint;
      upgraded: bigint;
    }>(
      plan
        .returnsRow({
          member_id: "pg/int4@1",
          name: "pg/text@1",
          avatar: { codecId: "pg/text@1", nullable: true },
          user_id: "pg/text@1",
          count: "pg/int8@1",
          legendary: "pg/int8@1",
          heroic: "pg/int8@1",
          unique: "pg/int8@1",
          upgraded: "pg/int8@1",
        })
        .build(),
    );

    return result.map((row) => ({
      memberId: row.member_id,
      name: row.name,
      avatar: row.avatar,
      userId: row.user_id,
      count: Number(row.count),
      byRarity: {
        LEGENDARY: Number(row.legendary),
        HEROIC: Number(row.heroic),
        UNIQUE: Number(row.unique),
        UPGRADED: Number(row.upgraded),
      },
    }));
  }

  private async getTopLegendaryItems(
    guildId: string,
    dateFrom: Date | null,
    world?: string,
    npcTypes?: NpcType[],
    excludeColossus?: boolean,
    limit = 10,
  ): Promise<TopItem[]> {
    const minimumDate = dateFrom ?? new Date(0);
    const filteredNpcTypes = npcTypes ?? [];
    const plan = this.prisma.raw.sql`
      WITH ranked_npcs AS (
        SELECT
          l.id as loot_id,
          ROW_NUMBER() OVER (
            PARTITION BY l.id
            ORDER BY
              CASE ns.type
                WHEN 'TITAN' THEN 1
                WHEN 'COLOSSUS' THEN 2
                WHEN 'HERO' THEN 3
                WHEN 'EVENT_HERO' THEN 4
                WHEN 'ELITE3' THEN 5
                WHEN 'ELITE2' THEN 6
                WHEN 'ELITE' THEN 7
                ELSE 8
              END
          ) as rn
        FROM "Loot" l
        INNER JOIN "LootSubmission" ls ON ls."lootId" = l.id
        INNER JOIN "LootNpc" ln ON ln."lootId" = l.id
        INNER JOIN "NpcSnapshot" ns ON ns.id = ln."npcSnapshotId"
        WHERE ls."guildId" = ${guildId}
          AND ns.type != 'COMMON'
          AND (${dateFrom === null} OR l."createdAt" >= ${rawTimestamp(minimumDate)})
          AND (${!world} OR l.world = ${world ?? ""})
          AND (${filteredNpcTypes.length === 0} OR ns.type::text = ANY(${rawTextArray(filteredNpcTypes)}::text[]))
          AND (${!excludeColossus} OR ns.type != 'COLOSSUS')
      )
      SELECT
        isnap."itemId" as item_id,
        MIN(li.hid) as hid,
        isnap.name,
        isnap.icon,
        isnap.rarity::text AS rarity,
        isnap.lvl,
        COUNT(*) as count
      FROM ranked_npcs rn
      INNER JOIN "Loot" l ON l.id = rn.loot_id
      INNER JOIN "LootItem" li ON li."lootId" = l.id
      INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
      WHERE rn.rn = 1
        AND isnap.rarity = 'LEGENDARY'
        AND isnap."itemType" NOT IN ('BLESS', 'UPGRADE', 'CONSUME')
      GROUP BY isnap."itemId", isnap.name, isnap.icon, isnap.rarity, isnap.lvl
      ORDER BY count DESC
      LIMIT ${limit}
    `;
    const result = await this.prisma.query<{
      item_id: number;
      hid: string;
      name: string;
      icon: string;
      rarity: ItemRarity;
      lvl: number;
      count: bigint;
    }>(
      plan
        .returnsRow({
          item_id: "pg/int4@1",
          hid: "pg/text@1",
          name: "pg/text@1",
          icon: "pg/text@1",
          rarity: "pg/text@1",
          lvl: "pg/int4@1",
          count: "pg/int8@1",
        })
        .build(),
    );

    return result.map((row) => ({
      itemId: row.item_id,
      hid: row.hid,
      name: row.name,
      icon: row.icon,
      rarity: row.rarity,
      lvl: row.lvl,
      count: Number(row.count),
    }));
  }
}
