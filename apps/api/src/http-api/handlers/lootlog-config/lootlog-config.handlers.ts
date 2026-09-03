import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { encodeDomainJson } from "../../domain-json.schema.js";
import { and, desc, eq, inArray } from "drizzle-orm";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  lootlogConfigNpcTable,
  lootlogConfigTable,
} from "#src/database/drizzle/schema";
import {
  LootlogApi,
  LootlogConfigControllerGetLootlogConfig200,
  LootlogConfigControllerUpdateNpc200,
  type UpdateLootlogConfigNpcDto,
} from "../../lootlog-api.js";

export class LootlogConfigAccessDenied extends TaggedErrorClass<LootlogConfigAccessDenied>()(
  "LootlogConfigAccessDenied",
  { status: Schema.Literals([401, 403, 404]), code: Schema.String },
) {}

export class LootlogConfigOperationError extends TaggedErrorClass<LootlogConfigOperationError>()(
  "LootlogConfigOperationError",
  { cause: Schema.Defect() },
) {}

export class LootlogConfigAuthorization extends Context.Service<
  LootlogConfigAuthorization,
  {
    readonly requireCapability: (options: {
      readonly guildId: string;
      readonly capability: PermissionValue;
    }) => Effect.Effect<
      { readonly guildId: string },
      LootlogConfigAccessDenied
    >;
  }
>()("@lootlog/api/http-api/lootlog-config/authorization") {}

export class LootlogConfigData extends Context.Service<
  LootlogConfigData,
  {
    readonly get: (
      guildId: string,
    ) => Effect.Effect<unknown, LootlogConfigOperationError>;
    readonly updateNpc: (
      guildId: string,
      npcId: string,
      payload: UpdateLootlogConfigNpcDto,
    ) => Effect.Effect<unknown, LootlogConfigOperationError>;
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
        updateNpc: (guildId, npcId, payload) => {
          const parsedNpcId = Number(npcId);
          if (!Number.isInteger(parsedNpcId)) {
            return Effect.fail(
              operationError(
                new ResourceNotFoundError("NPC configuration not found"),
              ),
            );
          }
          return database
            .update(lootlogConfigNpcTable)
            .set({
              allowedRarities: [...payload.allowedRarities],
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(lootlogConfigNpcTable.lootlogConfigId, guildId),
                eq(lootlogConfigNpcTable.id, parsedNpcId),
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
            );
        },
      });
    }),
  );
}

const authorize = (guildId: unknown) => {
  if (typeof guildId !== "string") {
    return Effect.fail(
      new LootlogConfigAccessDenied({
        status: 404,
        code: "GUILD_NOT_FOUND",
      }),
    );
  }
  return Effect.flatMap(LootlogConfigAuthorization, (authorization) =>
    authorization.requireCapability({ guildId, capability: Permission.ADMIN }),
  );
};

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  encodeDomainJson(value).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(schema)),
    Effect.mapError((cause) => new LootlogConfigOperationError({ cause })),
  );

export const getLootlogConfig = Effect.fn("getLootlogConfig")(function* (
  requestedGuildId: unknown,
) {
  const { guildId } = yield* authorize(requestedGuildId);
  const data = yield* LootlogConfigData;
  return yield* decode(
    LootlogConfigControllerGetLootlogConfig200,
    yield* data.get(guildId),
  );
});

export const updateLootlogConfigNpc = Effect.fn("updateLootlogConfigNpc")(
  function* (
    requestedGuildId: unknown,
    npcId: string,
    payload: UpdateLootlogConfigNpcDto,
  ) {
    const { guildId } = yield* authorize(requestedGuildId);
    const data = yield* LootlogConfigData;
    return yield* decode(
      LootlogConfigControllerUpdateNpc200,
      yield* data.updateNpc(guildId, npcId, payload),
    );
  },
);

const defectCause = (error: unknown) =>
  error instanceof LootlogConfigOperationError ? error.cause : error;
const orDieHttpFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) => Effect.die(defectCause(error)));

export const LootlogConfigHandlers = HttpApiBuilder.group(
  LootlogApi,
  "lootlog-config",
  (handlers) =>
    handlers
      .handle("LootlogConfigControllerGetLootlogConfig", ({ params }) =>
        orDieHttpFailure(getLootlogConfig(params.guildId)),
      )
      .handle("LootlogConfigControllerUpdateNpc", ({ params, payload }) =>
        orDieHttpFailure(
          updateLootlogConfigNpc(params.guildId, params.npcId, payload),
        ),
      ),
);
