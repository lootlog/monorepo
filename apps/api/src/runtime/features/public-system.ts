import { makeMapsOperation } from "#src/maps/maps.operation";
import { PublicGuildStatsCardRepository } from "#src/public-guild-stats-card/public-guild-stats-card.repository";
import {
  PublicGuildStatsCardAdapterError,
  PublicGuildStatsCardImageAdapter,
  makePublicGuildStatsCard,
} from "#src/public-guild-stats-card/public-guild-stats-card.service";
import { Effect, Layer } from "effect";
import { HttpClient } from "effect/unstable/http";
import {
  PublicSystemData,
  PublicSystemOperationError,
} from "#src/http-api/handlers/public-system/public-system.operations";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

export const publicSystemData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const config = yield* ApiRuntimeConfig;
    const httpClient = yield* HttpClient.HttpClient;
    const repository = yield* PublicGuildStatsCardRepository;
    const cacheOperation = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new PublicGuildStatsCardAdapterError({ cause }),
      });
    return PublicSystemData.layerServices({
      getMaps: makeMapsOperation({
        httpClient,
        redis,
        url: config.mapsApiUrl,
      }).pipe(
        Effect.mapError((cause) => new PublicSystemOperationError({ cause })),
      ),
      statsCard: makePublicGuildStatsCard({
        repository,
        environment: config.environment,
        image: new PublicGuildStatsCardImageAdapter(httpClient),
        cache: {
          get: (key) => cacheOperation(() => redis.get(key)),
          set: (key, value, ttl) =>
            cacheOperation(() => redis.set(key, value, ttl)),
          setNX: (key, value, ttl) =>
            cacheOperation(() => redis.setNX(key, value, ttl)),
          del: (key) =>
            cacheOperation(() => redis.del(key)).pipe(Effect.asVoid),
        },
      }),
      local: config.environment === "local",
    });
  }),
).pipe(Layer.provide(PublicGuildStatsCardRepository.layerDatabase));
