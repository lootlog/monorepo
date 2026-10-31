import { Effect, Layer } from "effect";
import { FactionWarsData } from "#src/http-api/handlers/faction-wars/faction-wars.handlers";
import { makeJsonCodec } from "#src/redis/redis.service";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { applicationLogger } from "#src/shared/application-logger";

/** Faction war reads shared through Redis; a Redis failure reads the database. */
export const factionWarsData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) =>
    FactionWarsData.make({
      getOrSet: (key, schema, load, ttlSeconds) =>
        redis.getOrSetJsonEffect({
          key,
          codec: makeJsonCodec(schema),
          factory: load,
          ttlSeconds,
          onError: (error) =>
            applicationLogger.warn("Faction war cache unavailable", error),
        }),
    }),
  ),
);
