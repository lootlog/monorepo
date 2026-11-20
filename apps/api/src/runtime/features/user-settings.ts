import { Effect, Layer } from "effect";
import {
  UserLootlogConfigData,
  UserLootlogConfigOperationError,
} from "#src/lootlog-config/user-lootlog-config-data";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";

export const userLootlogConfigData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) =>
    UserLootlogConfigData.layerDatabase({
      getOrSetJsonEffect: redis.getOrSetJson,
      invalidateScopes: (...scopes) =>
        redis
          .invalidateScopes(...scopes)
          .pipe(
            Effect.mapError(
              (cause) => new UserLootlogConfigOperationError({ cause }),
            ),
          ),
    }),
  ),
);
