import { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer } from "effect";
import { CharacterAurasResponse } from "#src/contracts/character-auras/schemas";
import {
  CharacterAuraHolders,
  characterAurasDataLayer,
  type CharacterAurasCache,
  type CharacterAurasEvents,
} from "#src/http-api/handlers/character-auras/character-auras.data-layer";
import { makeJsonCodec } from "#src/redis/redis.service";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";
import { CHARACTER_AURAS_CACHE_SCOPE } from "#src/shared/cache";

const listCodec = makeJsonCodec(CharacterAurasResponse);

const holdersCodec = makeJsonCodec(CharacterAuraHolders);

const makeCharacterAurasCache = (
  redis: ApiRedis["Service"],
): CharacterAurasCache => ({
  // Aura writes invalidate the list. The TTL bounds what they cannot see: a
  // newly proved account of a User who shows an aura.
  list: (load) =>
    redis.getOrSetJsonEffect({
      key: CHARACTER_AURAS_CACHE_SCOPE,
      scopes: [CHARACTER_AURAS_CACHE_SCOPE],
      factory: load,
      ttlSeconds: 30,
      codec: listCodec,
    }),
  // Every aura and grant write invalidates it; the TTL bounds only a failed
  // invalidation.
  holders: (load) =>
    redis.getOrSetJsonEffect({
      key: `${CHARACTER_AURAS_CACHE_SCOPE}:holders`,
      scopes: [CHARACTER_AURAS_CACHE_SCOPE],
      factory: load,
      ttlSeconds: 300,
      codec: holdersCodec,
    }),
  // The write is committed; readers catch up when the stored copies expire.
  invalidate: Effect.tryPromise(() =>
    redis.invalidateScopes(CHARACTER_AURAS_CACHE_SCOPE),
  ).pipe(
    Effect.catch((error) =>
      Effect.logWarning("Failed to invalidate the character aura list", error),
    ),
  ),
});

const makeCharacterAurasEvents = (
  rabbit: RabbitMessaging["Service"],
): CharacterAurasEvents => ({
  publishChanged: (change) =>
    rabbit
      .publish({
        exchange: "default",
        routingKey: RabbitRoutingKey.CHARACTER_AURAS_CHANGED,
        content: new TextEncoder().encode(JSON.stringify(change)),
      })
      .pipe(Effect.asVoid),
});

// Global chat admins wear auras and grant them to other Users.
export const characterAurasData = Layer.unwrap(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const redis = yield* ApiRedis;
    const { globalChatAdminUserIds } = yield* ApiRuntimeConfig;

    return characterAurasDataLayer(
      globalChatAdminUserIds,
      makeCharacterAurasEvents(rabbit),
      makeCharacterAurasCache(redis),
    );
  }),
);
