import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { RabbitMessaging, eventMessage } from "@lootlog/messaging";
import { Effect, Layer } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { makeRedisLockManager } from "#src/redis/redlock";
import { ResourceConflictError } from "@lootlog/protocol/http/errors";
import type { HeroSightingResponse } from "#src/contracts/hero-sightings/schemas";
import {
  makeCreateHeroSighting,
  makeHeroSightingClaims,
  makeHeroSightingReads,
  makeManualHeroSightings,
} from "#src/hero-sightings/hero-sightings.data-layer";
import { HeroSightingsData } from "#src/hero-sightings/hero-sightings-data";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";

/**
 * Publishes a changed sighting to the Organization's realtime clients and to
 * notification rules. Both confirms are awaited even when one fails.
 */
export const makeHeroSightingPublisher =
  (rabbit: RabbitMessaging["Service"]) => (sighting: HeroSightingResponse) => {
    return Effect.all(
      [
        RabbitRoutingKey.GUILDS_HERO_SIGHTINGS_UPDATE,
        RabbitRoutingKey.NOTIFICATIONS_HERO_SIGHTING_UPDATED,
      ].map((routingKey) => rabbit.publish(eventMessage(routingKey, sighting))),
      { concurrency: 2, mode: "result" },
    ).pipe(
      Effect.flatMap((results) => Effect.forEach(results, Effect.fromResult)),
    );
  };

export const heroSightingsData = Layer.unwrap(
  Effect.gen(function* () {
    const database = yield* ApiDatabase;
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;

    const locks = makeRedisLockManager(redis);

    const withLock = <A, E>(key: string, effect: Effect.Effect<A, E>) =>
      locks.withLock(
        key,
        30_000,
        effect,
        () =>
          new ResourceConflictError({ code: "HERO_SIGHTING_RACE_CONDITION" }),
      );

    const publish = makeHeroSightingPublisher(rabbit);

    return Layer.succeed(
      HeroSightingsData,
      HeroSightingsData.of({
        create: makeCreateHeroSighting(database, { publish, withLock }),
        ...makeHeroSightingReads(database),
        ...makeHeroSightingClaims(database, { publish }),
        ...makeManualHeroSightings(database, { publish, withLock }),
      }),
    );
  }),
);
