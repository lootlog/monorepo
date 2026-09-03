import {
  getEffectiveCapabilities,
  type AccessPolicy,
} from "@lootlog/domain/access-policy";
import { Logger } from "#src/shared/application-logger";
import { makeJsonCodec, RedisService } from "#src/redis/redis.service";
import { LootStatsResponseDto_Output } from "#src/http-api/contracts/loots/schemas";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import type { ItemRarityEnum as ItemRarity } from "@lootlog/schema/item-rarity";
import type { Permission } from "@lootlog/schema/permissions";
import type { roleTable } from "#src/database/drizzle/schema";
import { createHash } from "node:crypto";
import { Effect } from "effect";
import { createLootAccessFingerprint } from "@lootlog/domain/loot-visibility";
import {
  buildLootNpcVisibilitySql,
  toLootVisibilityRoles,
} from "#src/loots/loot-visibility";
import type {
  Period,
  LootStatsResponse,
  LootStatsOverview,
  RarityStats,
  TimelinePoint,
  TopNpc,
  TopContributor,
  TopItem,
} from "#src/loots/query/loot-stats";
import type { LootStatsQuery } from "#src/loots/query/loot-stats-query";

type Role = typeof roleTable.$inferSelect;

const CACHE_TTL_SECONDS = 60;

export class LootStatsService {
  private readonly logger = new Logger(LootStatsService.name);

  constructor(
    private readonly query: LootStatsQuery,
    private readonly redis: RedisService,
  ) {}

  invalidateCache(guildIds: string[]) {
    const uniqueGuildIds = [...new Set(guildIds)];
    return Effect.all(
      uniqueGuildIds.map((guildId) =>
        Effect.tryPromise({
          try: () => this.redis.deleteByPattern(`loot-stats:${guildId}:*`),
          catch: (cause) => cause,
        }).pipe(
          Effect.catch((error) =>
            Effect.sync(() =>
              this.logger.warn("Failed to invalidate loot stats cache", {
                error,
                guildId,
              }),
            ),
          ),
        ),
      ),
      { concurrency: "unbounded" },
    ).pipe(Effect.asVoid);
  }

  getLootStatsEffect(
    guildId: string,
    accessPolicy: AccessPolicy,
    roles: Role[],
    period: Period = "7d",
    world?: string,
    npcTypes?: string[],
    excludeColossus?: boolean,
  ) {
    const permissions = getEffectiveCapabilities(accessPolicy);
    const cacheKey = this.buildCacheKey(
      guildId,
      permissions,
      roles,
      period,
      world,
      npcTypes,
      excludeColossus,
    );
    const visibilityCondition = buildLootNpcVisibilitySql(permissions, roles);
    const dateFrom = this.getDateFromPeriod(period);
    const npcTypeFilter = npcTypes?.length
      ? npcTypes.filter((type): type is NpcType =>
          Object.values(NpcType).includes(type as NpcType),
        )
      : undefined;

    return Effect.gen(
      function* (this: LootStatsService) {
        const cached = yield* Effect.tryPromise({
          try: () =>
            this.redis.getJson(
              cacheKey,
              makeJsonCodec(LootStatsResponseDto_Output),
            ),
          catch: (cause) => cause,
        });
        if (cached !== null) {
          this.logger.debug(`Cache hit for ${cacheKey}`);
          return cached;
        }
        this.logger.debug(`Cache miss for ${cacheKey}`);
        const [
          overview,
          byRarity,
          timeline,
          topNpcs,
          topContributors,
          topItems,
        ] = yield* Effect.all(
          [
            this.getOverview(
              guildId,
              dateFrom,
              world,
              npcTypeFilter,
              excludeColossus,
              visibilityCondition,
            ),
            this.getByRarity(
              guildId,
              dateFrom,
              world,
              npcTypeFilter,
              excludeColossus,
              visibilityCondition,
            ),
            this.getTimeline(
              guildId,
              dateFrom,
              period,
              world,
              npcTypeFilter,
              excludeColossus,
              visibilityCondition,
            ),
            this.getTopNpcs(
              guildId,
              dateFrom,
              world,
              npcTypeFilter,
              excludeColossus,
              visibilityCondition,
            ),
            this.getTopContributors(
              guildId,
              dateFrom,
              world,
              npcTypeFilter,
              excludeColossus,
              visibilityCondition,
            ),
            this.getTopLegendaryItems(
              guildId,
              dateFrom,
              world,
              npcTypeFilter,
              excludeColossus,
              visibilityCondition,
            ),
          ] as const,
          { concurrency: "unbounded" },
        );
        const response = {
          overview,
          byRarity,
          timeline,
          topNpcs,
          topContributors,
          topItems,
        } satisfies LootStatsResponse;
        yield* Effect.tryPromise({
          try: () => this.redis.setJson(cacheKey, response, CACHE_TTL_SECONDS),
          catch: (cause) => cause,
        });
        return response;
      }.bind(this),
    ).pipe(
      Effect.withSpan("LootsController_getLootStats", {
        attributes: { adapter: "loot-stats", retryCount: 0 },
      }),
    );
  }

  private buildCacheKey(
    guildId: string,
    permissions: Permission[],
    roles: Role[],
    period: Period,
    world?: string,
    npcTypes?: string[],
    excludeColossus?: boolean,
  ): string {
    const accessFingerprint = createHash("sha256")
      .update(
        createLootAccessFingerprint({
          organizationId: guildId,
          permissions,
          roles: toLootVisibilityRoles(roles),
        }),
      )
      .digest("base64url");
    const parts = ["loot-stats", guildId, accessFingerprint, period];
    if (world) parts.push(world);
    if (npcTypes?.length) parts.push(npcTypes.sort().join(","));
    if (excludeColossus) parts.push("no-colossus");
    return parts.join(":");
  }

  private buildFilterConditions(
    dateFrom: Date | null,
    world?: string,
    npcTypes?: NpcType[],
    excludeColossus?: boolean,
  ) {
    const dateParamIndex = this.getDateFilterParamIndex();
    const worldParamIndex = this.getWorldFilterParamIndex(dateFrom);
    const npcTypesParamIndex = this.getNpcTypesFilterParamIndex(
      dateFrom,
      world,
    );
    const dateCondition = dateFrom
      ? `AND l."createdAt" >= $${dateParamIndex}`
      : "";
    const worldCondition = world ? `AND l.world = $${worldParamIndex}` : "";
    const npcTypeCondition = npcTypes?.length
      ? `AND ns.type = ANY($${npcTypesParamIndex}::text[])`
      : "";
    const excludeColossusCondition = excludeColossus
      ? `AND ns.type != 'COLOSSUS'`
      : "";
    const needsNpcFilter = !!(npcTypes?.length || excludeColossus);

    return {
      dateCondition,
      worldCondition,
      npcTypeCondition,
      excludeColossusCondition,
      needsNpcFilter,
    };
  }

  private getDateFilterParamIndex() {
    return 2;
  }

  private getWorldFilterParamIndex(dateFrom: Date | null) {
    if (dateFrom) {
      return 3;
    }

    return 2;
  }

  private getNpcTypesFilterParamIndex(dateFrom: Date | null, world?: string) {
    let paramIndex = 2;

    if (dateFrom) {
      paramIndex += 1;
    }

    if (world) {
      paramIndex += 1;
    }

    return paramIndex;
  }

  private buildFilterParams(
    guildId: string,
    dateFrom: Date | null,
    world?: string,
    npcTypes?: NpcType[],
  ): (string | Date | string[])[] {
    const params: (string | Date | string[])[] = [guildId];
    if (dateFrom) params.push(dateFrom);
    if (world) params.push(world);
    if (npcTypes?.length) params.push(npcTypes);
    return params;
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

  private getOverview(
    guildId: string,
    dateFrom: Date | null,
    world?: string,
    npcTypes?: NpcType[],
    excludeColossus?: boolean,
    visibilityCondition = "",
  ) {
    const {
      dateCondition,
      worldCondition,
      npcTypeCondition,
      excludeColossusCondition,
      needsNpcFilter,
    } = this.buildFilterConditions(dateFrom, world, npcTypes, excludeColossus);
    const params = this.buildFilterParams(guildId, dateFrom, world, npcTypes);

    return this.query<
      Array<{
        total_loots: bigint;
        total_items: bigint;
        legendary_items: bigint;
        heroic_items: bigint;
        avg_item_level: number | null;
      }>
    >(
      "loot-stats.overview",
      needsNpcFilter
        ? `
        WITH valid_loots AS (
          SELECT DISTINCT l.id as loot_id
          FROM "Loot" l
          INNER JOIN "OrganizationLootRecord" olr ON olr."lootId" = l.id
          INNER JOIN "LootNpc" ln ON ln."lootId" = l.id
          INNER JOIN "NpcSnapshot" ns ON ns.id = ln."npcSnapshotId"
          WHERE olr."guildId" = $1
            AND olr."archivedAt" IS NULL
          ${visibilityCondition}
            AND ns.type != 'COMMON'
          ${dateCondition}
          ${worldCondition}
          ${npcTypeCondition}
          ${excludeColossusCondition}
        )
        SELECT
          COUNT(DISTINCT l.id) as total_loots,
          COUNT(li.id) as total_items,
          COUNT(li.id) FILTER (WHERE isnap.rarity = 'LEGENDARY') as legendary_items,
          COUNT(li.id) FILTER (WHERE isnap.rarity = 'HEROIC') as heroic_items,
          AVG(isnap.lvl)::numeric as avg_item_level
        FROM valid_loots vl
        INNER JOIN "Loot" l ON l.id = vl.loot_id
        INNER JOIN "LootItem" li ON li."lootId" = l.id
        INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
      `
        : `
        SELECT
          COUNT(DISTINCT l.id) as total_loots,
          COUNT(li.id) as total_items,
          COUNT(li.id) FILTER (WHERE isnap.rarity = 'LEGENDARY') as legendary_items,
          COUNT(li.id) FILTER (WHERE isnap.rarity = 'HEROIC') as heroic_items,
          AVG(isnap.lvl)::numeric as avg_item_level
        FROM "Loot" l
        INNER JOIN "OrganizationLootRecord" olr ON olr."lootId" = l.id
        INNER JOIN "LootItem" li ON li."lootId" = l.id
        INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
        WHERE olr."guildId" = $1
          AND olr."archivedAt" IS NULL
        ${visibilityCondition}
        ${dateCondition}
        ${worldCondition}
      `,
      params,
    ).pipe(
      Effect.map((result): LootStatsOverview => {
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
      }),
    );
  }

  private getByRarity(
    guildId: string,
    dateFrom: Date | null,
    world?: string,
    npcTypes?: NpcType[],
    excludeColossus?: boolean,
    visibilityCondition = "",
  ) {
    const {
      dateCondition,
      worldCondition,
      npcTypeCondition,
      excludeColossusCondition,
      needsNpcFilter,
    } = this.buildFilterConditions(dateFrom, world, npcTypes, excludeColossus);
    const params = this.buildFilterParams(guildId, dateFrom, world, npcTypes);

    return this.query<
      Array<{
        rarity: ItemRarity;
        count: bigint;
      }>
    >(
      "loot-stats.by-rarity",
      needsNpcFilter
        ? `
        WITH valid_loots AS (
          SELECT DISTINCT l.id as loot_id
          FROM "Loot" l
          INNER JOIN "OrganizationLootRecord" olr ON olr."lootId" = l.id
          INNER JOIN "LootNpc" ln ON ln."lootId" = l.id
          INNER JOIN "NpcSnapshot" ns ON ns.id = ln."npcSnapshotId"
          WHERE olr."guildId" = $1
            AND olr."archivedAt" IS NULL
          ${visibilityCondition}
            AND ns.type != 'COMMON'
          ${dateCondition}
          ${worldCondition}
          ${npcTypeCondition}
          ${excludeColossusCondition}
        )
        SELECT
          isnap.rarity,
          COUNT(*) as count
        FROM valid_loots vl
        INNER JOIN "Loot" l ON l.id = vl.loot_id
        INNER JOIN "LootItem" li ON li."lootId" = l.id
        INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
        WHERE isnap.rarity IS NOT NULL
        GROUP BY isnap.rarity
      `
        : `
        SELECT
          isnap.rarity,
          COUNT(*) as count
        FROM "Loot" l
        INNER JOIN "OrganizationLootRecord" olr ON olr."lootId" = l.id
        INNER JOIN "LootItem" li ON li."lootId" = l.id
        INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
        WHERE olr."guildId" = $1
          AND olr."archivedAt" IS NULL
        ${visibilityCondition}
          AND isnap.rarity IS NOT NULL
        ${dateCondition}
        ${worldCondition}
        GROUP BY isnap.rarity
      `,
      params,
    ).pipe(
      Effect.map((result): Partial<Record<ItemRarity, RarityStats>> => {
        const total = result.reduce((sum, row) => sum + Number(row.count), 0);
        const byRarity: Partial<Record<ItemRarity, RarityStats>> = {};
        for (const row of result) {
          const count = Number(row.count);
          byRarity[row.rarity] = {
            count,
            percentage:
              total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0,
          };
        }
        return byRarity;
      }),
    );
  }

  private getTimeline(
    guildId: string,
    dateFrom: Date | null,
    period: Period,
    world?: string,
    npcTypes?: NpcType[],
    excludeColossus?: boolean,
    visibilityCondition = "",
  ) {
    const {
      dateCondition,
      worldCondition,
      npcTypeCondition,
      excludeColossusCondition,
      needsNpcFilter,
    } = this.buildFilterConditions(dateFrom, world, npcTypes, excludeColossus);
    const truncUnit = this.getTimelineTruncUnit(period);
    const params = this.buildFilterParams(guildId, dateFrom, world, npcTypes);

    return this.query<
      Array<{
        date: Date;
        rarity: ItemRarity | null;
        count: bigint;
      }>
    >(
      "loot-stats.timeline",
      needsNpcFilter
        ? `
        WITH valid_loots AS (
          SELECT DISTINCT l.id as loot_id, l."createdAt"
          FROM "Loot" l
          INNER JOIN "OrganizationLootRecord" olr ON olr."lootId" = l.id
          INNER JOIN "LootNpc" ln ON ln."lootId" = l.id
          INNER JOIN "NpcSnapshot" ns ON ns.id = ln."npcSnapshotId"
          WHERE olr."guildId" = $1
            AND olr."archivedAt" IS NULL
          ${visibilityCondition}
            AND ns.type != 'COMMON'
          ${dateCondition}
          ${worldCondition}
          ${npcTypeCondition}
          ${excludeColossusCondition}
        )
        SELECT
          date_trunc('${truncUnit}', vl."createdAt") as date,
          isnap.rarity,
          COUNT(*) as count
        FROM valid_loots vl
        INNER JOIN "LootItem" li ON li."lootId" = vl.loot_id
        INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
        GROUP BY date_trunc('${truncUnit}', vl."createdAt"), isnap.rarity
        ORDER BY date ASC
      `
        : `
        SELECT
          date_trunc('${truncUnit}', l."createdAt") as date,
          isnap.rarity,
          COUNT(*) as count
        FROM "Loot" l
        INNER JOIN "OrganizationLootRecord" olr ON olr."lootId" = l.id
        INNER JOIN "LootItem" li ON li."lootId" = l.id
        INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
        WHERE olr."guildId" = $1
          AND olr."archivedAt" IS NULL
        ${visibilityCondition}
        ${dateCondition}
        ${worldCondition}
        GROUP BY date_trunc('${truncUnit}', l."createdAt"), isnap.rarity
        ORDER BY date ASC
      `,
      params,
    ).pipe(
      Effect.map((result): TimelinePoint[] => {
        const timelineMap = new Map<
          string,
          { total: number; byRarity: Partial<Record<ItemRarity, number>> }
        >();
        for (const row of result) {
          const date = row.date.toISOString();
          const entry = timelineMap.get(date) ?? { total: 0, byRarity: {} };
          const count = Number(row.count);
          entry.total += count;
          if (row.rarity) {
            entry.byRarity[row.rarity] =
              (entry.byRarity[row.rarity] ?? 0) + count;
          }
          timelineMap.set(date, entry);
        }
        return Array.from(timelineMap.entries()).map(([date, data]) => ({
          date,
          total: data.total,
          byRarity: data.byRarity,
        }));
      }),
    );
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

  private getTopNpcs(
    guildId: string,
    dateFrom: Date | null,
    world?: string,
    npcTypes?: NpcType[],
    excludeColossus?: boolean,
    visibilityCondition = "",
    limit = 10,
  ) {
    const {
      dateCondition,
      worldCondition,
      npcTypeCondition,
      excludeColossusCondition,
    } = this.buildFilterConditions(dateFrom, world, npcTypes, excludeColossus);
    const params: (string | Date | string[] | number)[] =
      this.buildFilterParams(guildId, dateFrom, world, npcTypes);
    const limitParamIndex = params.length + 1;
    params.push(limit);

    return this.query<
      Array<{
        npc_id: number;
        name: string;
        type: NpcType | null;
        lvl: number | null;
        icon: string | null;
        count: bigint;
        legendary: bigint;
        heroic: bigint;
      }>
    >(
      "loot-stats.top-npcs",
      `
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
        INNER JOIN "OrganizationLootRecord" olr ON olr."lootId" = l.id
        INNER JOIN "LootNpc" ln ON ln."lootId" = l.id
        INNER JOIN "NpcSnapshot" ns ON ns.id = ln."npcSnapshotId"
        WHERE olr."guildId" = $1
          AND olr."archivedAt" IS NULL
        ${visibilityCondition}
          AND ns.type != 'COMMON'
        ${dateCondition}
        ${worldCondition}
        ${npcTypeCondition}
        ${excludeColossusCondition}
      )
      SELECT
        rn."npcId" as npc_id,
        rn.name,
        rn.type,
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
      LIMIT $${limitParamIndex}
    `,
      params,
    ).pipe(
      Effect.map((result): TopNpc[] =>
        result.map((row) => ({
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
        })),
      ),
    );
  }

  private getTopContributors(
    guildId: string,
    dateFrom: Date | null,
    world?: string,
    npcTypes?: NpcType[],
    excludeColossus?: boolean,
    visibilityCondition = "",
    limit = 10,
  ) {
    const {
      dateCondition,
      worldCondition,
      npcTypeCondition,
      excludeColossusCondition,
      needsNpcFilter,
    } = this.buildFilterConditions(dateFrom, world, npcTypes, excludeColossus);
    const params: (string | Date | string[] | number)[] =
      this.buildFilterParams(guildId, dateFrom, world, npcTypes);
    const limitParamIndex = params.length + 1;
    params.push(limit);

    return this.query<
      Array<{
        member_id: number;
        name: string;
        avatar: string | null;
        user_id: string;
        count: bigint;
        legendary: bigint;
        heroic: bigint;
        unique: bigint;
        upgraded: bigint;
      }>
    >(
      "loot-stats.top-contributors",
      needsNpcFilter
        ? `
        WITH valid_loots AS (
          SELECT DISTINCT l.id as loot_id
          FROM "Loot" l
          INNER JOIN "OrganizationLootRecord" olr ON olr."lootId" = l.id
          INNER JOIN "LootNpc" ln ON ln."lootId" = l.id
          INNER JOIN "NpcSnapshot" ns ON ns.id = ln."npcSnapshotId"
          WHERE olr."guildId" = $1
            AND olr."archivedAt" IS NULL
          ${visibilityCondition}
            AND ns.type != 'COMMON'
          ${dateCondition}
          ${worldCondition}
          ${npcTypeCondition}
          ${excludeColossusCondition}
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
        INNER JOIN "OrganizationLootRecord" olr ON olr."lootId" = l.id
        INNER JOIN "LootSubmission" ls ON ls."organizationLootRecordId" = olr.id
        INNER JOIN "Member" m ON m.id = ls."memberId"
        INNER JOIN "LootItem" li ON li."lootId" = l.id
        INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
        WHERE olr."guildId" = $1
          AND olr."archivedAt" IS NULL
        ${visibilityCondition}
        GROUP BY m.id, m.name, m.avatar, m."userId"
        ORDER BY count DESC
        LIMIT $${limitParamIndex}
      `
        : `
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
        INNER JOIN "OrganizationLootRecord" olr ON olr."lootId" = l.id
        INNER JOIN "LootSubmission" ls ON ls."organizationLootRecordId" = olr.id
        INNER JOIN "Member" m ON m.id = ls."memberId"
        INNER JOIN "LootItem" li ON li."lootId" = l.id
        INNER JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
        WHERE olr."guildId" = $1
          AND olr."archivedAt" IS NULL
        ${visibilityCondition}
        ${dateCondition}
        ${worldCondition}
        GROUP BY m.id, m.name, m.avatar, m."userId"
        ORDER BY count DESC
        LIMIT $${limitParamIndex}
      `,
      params,
    ).pipe(
      Effect.map((result): TopContributor[] =>
        result.map((row) => ({
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
        })),
      ),
    );
  }

  private getTopLegendaryItems(
    guildId: string,
    dateFrom: Date | null,
    world?: string,
    npcTypes?: NpcType[],
    excludeColossus?: boolean,
    visibilityCondition = "",
    limit = 10,
  ) {
    const {
      dateCondition,
      worldCondition,
      npcTypeCondition,
      excludeColossusCondition,
    } = this.buildFilterConditions(dateFrom, world, npcTypes, excludeColossus);
    const params: (string | Date | string[] | number)[] =
      this.buildFilterParams(guildId, dateFrom, world, npcTypes);
    const limitParamIndex = params.length + 1;
    params.push(limit);

    return this.query<
      Array<{
        item_id: number;
        hid: string;
        name: string;
        icon: string;
        rarity: ItemRarity;
        lvl: number;
        count: bigint;
      }>
    >(
      "loot-stats.top-items",
      `
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
        INNER JOIN "OrganizationLootRecord" olr ON olr."lootId" = l.id
        INNER JOIN "LootNpc" ln ON ln."lootId" = l.id
        INNER JOIN "NpcSnapshot" ns ON ns.id = ln."npcSnapshotId"
        WHERE olr."guildId" = $1
          AND olr."archivedAt" IS NULL
        ${visibilityCondition}
          AND ns.type != 'COMMON'
        ${dateCondition}
        ${worldCondition}
        ${npcTypeCondition}
        ${excludeColossusCondition}
      )
      SELECT
        isnap."itemId" as item_id,
        MIN(li.hid) as hid,
        isnap.name,
        isnap.icon,
        isnap.rarity,
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
      LIMIT $${limitParamIndex}
    `,
      params,
    ).pipe(
      Effect.map((result): TopItem[] =>
        result.map((row) => ({
          itemId: row.item_id,
          hid: row.hid,
          name: row.name,
          icon: row.icon,
          rarity: row.rarity,
          lvl: row.lvl,
          count: Number(row.count),
        })),
      ),
    );
  }
}
