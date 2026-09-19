import {
  getEffectiveCapabilities,
  type AccessPolicy,
} from "@lootlog/domain/access-policy";
import { Logger } from "#src/shared/application-logger";
import { makeJsonCodec, RedisService } from "#src/redis/redis.service";
import { LootStatsResponse as LootStatsResponseSchema } from "#src/contracts/loots/schemas";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import type { ItemRarityEnum as ItemRarity } from "@lootlog/schema/item-rarity";
import type { Permission } from "@lootlog/schema/permissions";
import { lootTable, type roleTable } from "#src/database/drizzle/schema";
import { createHash } from "node:crypto";
import { Effect, Schema } from "effect";
import { createLootAccessFingerprint } from "@lootlog/domain/loot-visibility";
import {
  buildLootNpcVisibilityCondition,
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
} from "#src/loots/query/loot-stats";
import {
  buildLootStatsQueries,
  runLootStatsQuery,
} from "#src/loots/query/loot-stats-query";

type Role = typeof roleTable.$inferSelect;

const CACHE_TTL_SECONDS = 60;

export class LootStatsService {
  private readonly logger = new Logger(LootStatsService.name);

  constructor(
    private readonly database: Parameters<typeof buildLootStatsQueries>[0],
    private readonly redis: Pick<
      RedisService,
      "getOrSetJsonEffect" | "invalidateScopes"
    >,
  ) {}

  invalidateCache(guildIds: string[]) {
    const uniqueGuildIds = [...new Set(guildIds)];

    return Effect.all(
      uniqueGuildIds.map((guildId) =>
        Effect.tryPromise({
          try: () => this.redis.invalidateScopes(`loot-stats:${guildId}`),
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

    const visibility = buildLootNpcVisibilityCondition(
      lootTable.id,
      permissions,
      roles,
    );

    const dateFrom = this.getDateFromPeriod(period);

    const npcTypeFilter = npcTypes?.length
      ? npcTypes.filter((type): type is NpcType =>
          Object.values(NpcType).some((npcType) => npcType === type),
        )
      : undefined;

    const load = Effect.gen(
      function* (this: LootStatsService) {
        const queries = buildLootStatsQueries(this.database, {
          guildId,
          dateFrom,
          world,
          npcTypes: npcTypeFilter,
          excludeColossus,
          visibility,
          truncUnit: this.getTimelineTruncUnit(period),
        });

        const [
          overview,
          byRarity,
          timeline,
          topNpcs,
          topContributors,
          topItems,
        ] = yield* Effect.all(
          [
            this.getOverview(queries.overview),
            this.getByRarity(queries.byRarity),
            this.getTimeline(queries.timeline),
            this.getTopNpcs(queries.topNpcs),
            this.getTopContributors(queries.topContributors),
            this.getTopLegendaryItems(queries.topItems),
          ] as const,
          { concurrency: "unbounded" },
        );

        return {
          overview,
          byRarity,
          timeline,
          topNpcs,
          topContributors,
          topItems,
        } satisfies LootStatsResponse;
      }.bind(this),
    );

    return this.redis
      .getOrSetJsonEffect({
        key: cacheKey,
        scopes: [`loot-stats:${guildId}`],
        ttlSeconds: CACHE_TTL_SECONDS,
        codec: makeJsonCodec(LootStatsResponseSchema),
        factory: load,
        onError: (error) =>
          this.logger.warn("Loot statistics cache unavailable", error),
      })
      .pipe(
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
    query: ReturnType<typeof buildLootStatsQueries>["overview"],
  ) {
    return runLootStatsQuery("loot-stats.overview", query).pipe(
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
    query: ReturnType<typeof buildLootStatsQueries>["byRarity"],
  ) {
    return runLootStatsQuery("loot-stats.by-rarity", query).pipe(
      Effect.map((result): Partial<Record<ItemRarity, RarityStats>> => {
        const total = result.reduce((sum, row) => sum + Number(row.count), 0);
        const byRarity: Partial<Record<ItemRarity, RarityStats>> = {};

        for (const row of result) {
          const count = Number(row.count);

          if (row.rarity === null) continue;
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
    query: ReturnType<typeof buildLootStatsQueries>["timeline"],
  ) {
    return runLootStatsQuery("loot-stats.timeline", query).pipe(
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

  private getTimelineTruncUnit(period: Period): "hour" | "day" | "week" {
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
    query: ReturnType<typeof buildLootStatsQueries>["topNpcs"],
  ) {
    return runLootStatsQuery("loot-stats.top-npcs", query).pipe(
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
    query: ReturnType<typeof buildLootStatsQueries>["topContributors"],
  ) {
    return runLootStatsQuery("loot-stats.top-contributors", query).pipe(
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
    query: ReturnType<typeof buildLootStatsQueries>["topItems"],
  ) {
    return runLootStatsQuery("loot-stats.top-items", query).pipe(
      Effect.map((result) =>
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
      Effect.flatMap(
        Schema.decodeUnknownEffect(LootStatsResponseSchema.fields.topItems),
      ),
      Effect.map((items) => Array.from(items)),
    );
  }
}
