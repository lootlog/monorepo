import { NotFoundException } from "#src/shared/http/http-errors";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "../database/drizzle/database.js";
import { DrizzleDatabaseRuntime } from "../database/drizzle/runtime.js";
import {
  itemRarityEnum,
  lootlogConfigNpcTable,
  lootlogConfigTable,
  npcTypeEnum,
} from "../database/drizzle/schema.js";
import type { UpdateLootlogConfigNpcDto } from "./dto/update-lootlog-config-npc.dto.js";
import type { UpdateLootlogConfigDto } from "./dto/update-lootlog-config.dto.js";

export class LootlogConfigService {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async getLootlogConfig(guildId: string) {
    const configs = await this.getMultipleLootlogConfigs([guildId]);
    return configs[0] ?? null;
  }

  getMultipleLootlogConfigs(guildIds: string[]) {
    if (guildIds.length === 0) return Promise.resolve([]);

    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        Effect.gen(function* () {
          const configs = yield* database
            .select()
            .from(lootlogConfigTable)
            .where(inArray(lootlogConfigTable.id, guildIds));
          if (configs.length === 0) return [];

          const npcs = yield* database
            .select()
            .from(lootlogConfigNpcTable)
            .where(
              inArray(
                lootlogConfigNpcTable.lootlogConfigId,
                configs.map(({ id }) => id),
              ),
            )
            .orderBy(desc(lootlogConfigNpcTable.id));

          return configs.map((config) => ({
            ...config,
            npcs: npcs.filter(
              ({ lootlogConfigId }) => lootlogConfigId === config.id,
            ),
          }));
        }),
      ),
    );
  }

  async createLootlogConfig(guildId: string) {
    if (await this.getLootlogConfig(guildId)) return;

    const now = new Date();
    await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            yield* transaction.insert(lootlogConfigTable).values({
              id: guildId,
              createdAt: now,
              updatedAt: now,
            });
            yield* transaction.insert(lootlogConfigNpcTable).values(
              npcTypeEnum.enumValues.map((npcType) => ({
                lootlogConfigId: guildId,
                npcType,
                allowedRarities: [...itemRarityEnum.enumValues],
                createdAt: now,
                updatedAt: now,
              })),
            );
          }),
        ),
      ),
    );
    return this.getLootlogConfig(guildId);
  }

  async updateLootlogConfig(guildId: string, { npcs }: UpdateLootlogConfigDto) {
    await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            const existing = yield* transaction
              .select({ id: lootlogConfigTable.id })
              .from(lootlogConfigTable)
              .where(eq(lootlogConfigTable.id, guildId))
              .limit(1);
            if (!existing[0]) {
              return yield* Effect.fail(
                new NotFoundException("Lootlog configuration not found"),
              );
            }

            for (const npc of npcs) {
              yield* transaction
                .update(lootlogConfigNpcTable)
                .set({
                  allowedRarities: npc.allowedRarities,
                  updatedAt: new Date(),
                })
                .where(
                  and(
                    eq(lootlogConfigNpcTable.lootlogConfigId, guildId),
                    eq(lootlogConfigNpcTable.npcType, npc.npcType),
                  ),
                );
            }
          }),
        ),
      ),
    );
    return this.getLootlogConfig(guildId);
  }

  async updateNpc(
    guildId: string,
    npcId: string,
    data: UpdateLootlogConfigNpcDto,
  ) {
    const parsedNpcId = Number(npcId);
    if (!Number.isInteger(parsedNpcId)) {
      throw new NotFoundException("NPC configuration not found");
    }

    const updated = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .update(lootlogConfigNpcTable)
          .set({ allowedRarities: data.allowedRarities, updatedAt: new Date() })
          .where(
            and(
              eq(lootlogConfigNpcTable.lootlogConfigId, guildId),
              eq(lootlogConfigNpcTable.id, parsedNpcId),
            ),
          )
          .returning(),
      ),
    );
    if (!updated[0]) {
      throw new NotFoundException("NPC configuration not found");
    }
    return updated[0];
  }
}
