import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, countDistinct, eq, gte, isNull, sql } from "drizzle-orm";
import { Context, Effect, Layer, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  itemSnapshotTable,
  lootItemTable,
  lootTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/schema";

export type GuildStatsCardGuild = {
  readonly id: string;
  readonly name: string;
  readonly icon: string | null;
  readonly publicStatsCardEnabled: boolean;
};
export type GuildStatsCardLootStats = {
  readonly totalLoots: number;
  readonly legendaryItems: number;
  readonly heroicItems: number;
};

export class PublicGuildStatsCardPersistenceError extends TaggedErrorClass<PublicGuildStatsCardPersistenceError>()(
  "PublicGuildStatsCardPersistenceError",
  { cause: Schema.Defect() },
) {}

export interface PublicGuildStatsCardRepositoryService {
  readonly findActiveGuild: (
    guildId: string,
  ) => Effect.Effect<
    GuildStatsCardGuild | null,
    PublicGuildStatsCardPersistenceError
  >;
  readonly getLootStats: (
    guildId: string,
    dateFrom: Date,
  ) => Effect.Effect<
    GuildStatsCardLootStats,
    PublicGuildStatsCardPersistenceError
  >;
}

export class PublicGuildStatsCardRepository extends Context.Service<
  PublicGuildStatsCardRepository,
  PublicGuildStatsCardRepositoryService
>()("@lootlog/api/public-guild-stats-card/repository") {
  static readonly layerDatabase = Layer.effect(
    PublicGuildStatsCardRepository,
    Effect.map(ApiDatabase, (database) => {
      const persistenceError = (cause: unknown) =>
        new PublicGuildStatsCardPersistenceError({ cause });
      return PublicGuildStatsCardRepository.of({
        findActiveGuild: (guildId) =>
          database
            .select({
              id: guildTable.id,
              name: guildTable.name,
              icon: guildTable.icon,
              publicStatsCardEnabled: guildTable.publicStatsCardEnabled,
            })
            .from(guildTable)
            .where(and(eq(guildTable.id, guildId), eq(guildTable.active, true)))
            .limit(1)
            .pipe(
              Effect.map((rows) => rows[0] ?? null),
              Effect.mapError(persistenceError),
            ),
        getLootStats: (guildId, dateFrom) =>
          database
            .select({
              totalLoots: countDistinct(lootTable.id),
              legendaryItems:
                sql<number>`COUNT(${lootItemTable.id}) FILTER (WHERE ${itemSnapshotTable.rarity} = 'LEGENDARY')`.mapWith(
                  Number,
                ),
              heroicItems:
                sql<number>`COUNT(${lootItemTable.id}) FILTER (WHERE ${itemSnapshotTable.rarity} = 'HEROIC')`.mapWith(
                  Number,
                ),
            })
            .from(organizationLootRecordTable)
            .innerJoin(
              lootTable,
              eq(lootTable.id, organizationLootRecordTable.lootId),
            )
            .leftJoin(lootItemTable, eq(lootItemTable.lootId, lootTable.id))
            .leftJoin(
              itemSnapshotTable,
              eq(itemSnapshotTable.id, lootItemTable.itemSnapshotId),
            )
            .where(
              and(
                eq(organizationLootRecordTable.guildId, guildId),
                isNull(organizationLootRecordTable.archivedAt),
                gte(lootTable.createdAt, dateFrom),
              ),
            )
            .pipe(
              Effect.map(
                (rows) =>
                  rows[0] ?? {
                    totalLoots: 0,
                    legendaryItems: 0,
                    heroicItems: 0,
                  },
              ),
              Effect.mapError(persistenceError),
            ),
      });
    }),
  );
}
