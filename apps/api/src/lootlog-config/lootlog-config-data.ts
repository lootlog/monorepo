import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Layer, Schema } from "effect";
import { and, desc, eq, inArray } from "drizzle-orm";
import { ResourceNotFoundError } from "@lootlog/protocol/http/errors";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  lootlogConfigNpcTable,
  lootlogConfigTable,
} from "#src/database/drizzle/loot.schema";
import type { UpdateNpcLootlogConfigRequest } from "#src/contracts/lootlog-config/schemas";

export class LootlogConfigOperationError extends TaggedErrorClass<LootlogConfigOperationError>()(
  "LootlogConfigOperationError",
  { cause: Schema.Defect() },
) {}

type LootlogConfigNpc = typeof lootlogConfigNpcTable.$inferSelect;

type LootlogConfig = typeof lootlogConfigTable.$inferSelect & {
  readonly npcs: ReadonlyArray<LootlogConfigNpc>;
};

export class LootlogConfigData extends Context.Service<
  LootlogConfigData,
  {
    readonly get: (
      guildId: string,
    ) => Effect.Effect<LootlogConfig | null, LootlogConfigOperationError>;
    readonly updateNpc: (
      guildId: string,
      npcId: number,
      payload: UpdateNpcLootlogConfigRequest,
    ) => Effect.Effect<LootlogConfigNpc, LootlogConfigOperationError>;
  }
>()("@lootlog/api/http-api/lootlog-config/data") {
  static readonly layerDatabase = Layer.effect(
    LootlogConfigData,
    Effect.map(ApiDatabase, (database) => {
      const operationError = (cause: unknown) =>
        new LootlogConfigOperationError({ cause });

      return LootlogConfigData.of({
        get: (guildId) =>
          Effect.gen(function* () {
            const configs = yield* database
              .select()
              .from(lootlogConfigTable)
              .where(inArray(lootlogConfigTable.id, [guildId]));

            const config = configs[0];

            if (!config) return null;

            const npcs = yield* database
              .select()
              .from(lootlogConfigNpcTable)
              .where(eq(lootlogConfigNpcTable.lootlogConfigId, guildId))
              .orderBy(desc(lootlogConfigNpcTable.id));

            return { ...config, npcs };
          }).pipe(Effect.mapError(operationError)),
        updateNpc: (guildId, npcId, payload) =>
          database
            .update(lootlogConfigNpcTable)
            .set({
              allowedRarities: [...payload.allowedRarities],
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(lootlogConfigNpcTable.lootlogConfigId, guildId),
                eq(lootlogConfigNpcTable.id, npcId),
              ),
            )
            .returning()
            .pipe(
              Effect.mapError(operationError),
              Effect.flatMap((rows) =>
                rows[0]
                  ? Effect.succeed(rows[0])
                  : Effect.fail(
                      operationError(
                        new ResourceNotFoundError(
                          "NPC configuration not found",
                        ),
                      ),
                    ),
              ),
            ),
      });
    }),
  );
}
