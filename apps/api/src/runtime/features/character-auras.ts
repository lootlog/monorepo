import { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer } from "effect";
import { CharacterAurasResponse } from "#src/contracts/character-auras/schemas";
import {
  characterAurasDataLayer,
  type CharacterAurasEvents,
  type CharacterAurasListCache,
} from "#src/http-api/handlers/character-auras/character-auras.data-layer";
import { makeJsonCodec } from "#src/redis/redis.service";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

const LIST_CACHE_SCOPE = "character-auras:list";

const listCodec = makeJsonCodec(CharacterAurasResponse);

// Aura writes invalidate the list. The TTL bounds what they cannot see: a
// newly proved account of a User who shows an aura, and a deleted account.
const makeCharacterAurasListCache = (
  redis: ApiRedis["Service"],
): CharacterAurasListCache => ({
  read: (load) =>
    redis.getOrSetJsonEffect({
      key: LIST_CACHE_SCOPE,
      scopes: [LIST_CACHE_SCOPE],
      factory: load,
      ttlSeconds: 30,
      codec: listCodec,
    }),
  // The write is committed; readers catch up when the stored list expires.
  invalidate: Effect.tryPromise(() =>
    redis.invalidateScopes(LIST_CACHE_SCOPE),
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
      makeCharacterAurasListCache(redis),
    );
  }),
);
