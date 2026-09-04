import { makeJsonCodec } from "#src/redis/redis.service";
import { Effect, Layer } from "effect";
import {
  UserLootlogConfigData,
  UserLootlogConfigOperationError,
  type UserLootlogConfigCache,
} from "#src/http-api/handlers/user-lootlog-config/user-lootlog-config.handlers";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";

export const userLootlogConfigData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) => {
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new UserLootlogConfigOperationError({ cause }),
      });
    const cache: UserLootlogConfigCache = {
      getJson: (key, schema) =>
        attempt(() => redis.getJson(key, makeJsonCodec(schema))),
      setJson: (key, value, ttl) =>
        attempt(() => redis.setJson(key, value, ttl)),
      deleteByPattern: (pattern) =>
        attempt(() => redis.deleteByPattern(pattern)).pipe(Effect.asVoid),
    };
    return UserLootlogConfigData.layerDatabase(cache);
  }),
);
