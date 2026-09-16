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
      getOrSetJsonEffect: (options) => redis.getOrSetJsonEffect(options),
      invalidateScopes: (...scopes) =>
        attempt(() => redis.invalidateScopes(...scopes)).pipe(Effect.asVoid),
    };

    return UserLootlogConfigData.layerDatabase(cache);
  }),
);
