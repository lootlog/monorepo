import { Injectable } from "@nestjs/common";
import { and, countDistinct, eq, gte, isNull, sql } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  guildTable,
  itemSnapshotTable,
  lootItemTable,
  lootTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/schema";

@Injectable()
export class PublicGuildStatsCardRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async findActiveGuild(guildId: string) {
    const rows = await this.run((database) =>
      database
        .select({
          id: guildTable.id,
          name: guildTable.name,
          icon: guildTable.icon,
          publicStatsCardEnabled: guildTable.publicStatsCardEnabled,
        })
        .from(guildTable)
        .where(and(eq(guildTable.id, guildId), eq(guildTable.active, true)))
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async getLootStats(guildId: string, dateFrom: Date) {
    const rows = await this.run((database) =>
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
        ),
    );
    return rows[0] ?? { totalLoots: 0, legendaryItems: 0, heroicItems: 0 };
  }

  private run<A, E>(
    query: (database: typeof ApiDatabase.Service) => Effect.Effect<A, E, never>,
  ) {
    return this.databaseRuntime.runPromise(Effect.flatMap(ApiDatabase, query));
  }
}
