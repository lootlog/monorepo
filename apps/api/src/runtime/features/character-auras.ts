import { makeJsonCodec } from "@lootlog/database/redis-cache-fill";
import { RabbitMessaging, eventMessage } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer } from "effect";
import { CharacterAurasResponse } from "#src/contracts/character-auras/schemas";
import {
  CharacterAuraHolders,
  characterAurasDataLayer,
  type CharacterAurasCache,
  type CharacterAurasEvents,
} from "#src/character-auras/character-auras.data-layer";
import type { RedisService } from "#src/redis/redis.service";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { LootlogAdminDirectory } from "#src/runtime/features/platform-role-directories";
import { CHARACTER_AURAS_CACHE_SCOPE } from "#src/shared/cache";

const listCodec = makeJsonCodec(CharacterAurasResponse);

const holdersCodec = makeJsonCodec(CharacterAuraHolders);

const makeCharacterAurasCache = (redis: RedisService): CharacterAurasCache => ({
  list: (load) =>
    redis.getOrSetJson({
      key: CHARACTER_AURAS_CACHE_SCOPE,
      scopes: [CHARACTER_AURAS_CACHE_SCOPE],
      factory: load,
      ttlSeconds: 30,
      codec: listCodec,
    }),
  holders: (load) =>
    redis.getOrSetJson({
      key: `${CHARACTER_AURAS_CACHE_SCOPE}:holders:personal`,
      scopes: [CHARACTER_AURAS_CACHE_SCOPE],
      factory: load,
      ttlSeconds: 300,
      codec: holdersCodec,
    }),
  invalidate: redis
    .invalidateScopes(CHARACTER_AURAS_CACHE_SCOPE)
    .pipe(
      Effect.catch((error) =>
        Effect.logWarning(
          "Failed to invalidate the character aura list",
          error,
        ),
      ),
    ),
});

const makeCharacterAurasEvents = (
  rabbit: RabbitMessaging["Service"],
): CharacterAurasEvents => ({
  publishChanged: (change) =>
    rabbit
      .publish(eventMessage(RabbitRoutingKey.CHARACTER_AURAS_CHANGED, change))
      .pipe(Effect.asVoid),
});

export const characterAurasData = Layer.unwrap(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const redis = yield* ApiRedis;
    const admins = yield* LootlogAdminDirectory;

    return characterAurasDataLayer(
      admins,
      makeCharacterAurasEvents(rabbit),
      makeCharacterAurasCache(redis),
    );
  }),
).pipe(Layer.provide(LootlogAdminDirectory.layer));
