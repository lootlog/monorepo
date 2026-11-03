import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { RabbitMessaging } from "@lootlog/messaging";
import { Effect, Layer } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { RedlockService } from "#src/redis/redlock";
import { ResourceConflictError } from "#src/shared/http/http-errors";
import type { HeroSightingResponse } from "#src/contracts/hero-sightings/schemas";
import {
  makeCreateHeroSighting,
  makeHeroSightingClaims,
  makeHeroSightingReads,
} from "#src/http-api/handlers/hero-sightings/hero-sightings.data-layer";
import { HeroSightingsData } from "#src/http-api/handlers/hero-sightings/hero-sightings.handlers";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";

/**
 * Publishes a changed sighting to the Organization's realtime clients and to
 * notification rules. Both confirms are awaited even when one fails.
 */
export const makeHeroSightingPublisher =
  (rabbit: RabbitMessaging["Service"]) => (sighting: HeroSightingResponse) => {
    const content = new TextEncoder().encode(JSON.stringify(sighting));

    return Effect.all(
      [
        RabbitRoutingKey.GUILDS_HERO_SIGHTINGS_UPDATE,
        RabbitRoutingKey.NOTIFICATIONS_HERO_SIGHTING_UPDATED,
      ].map((routingKey) =>
        rabbit.publish({ exchange: "default", routingKey, content }),
      ),
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

    const redlock = new RedlockService(redis).createInstance({
      automaticExtensionThreshold: 5000,
    });

    const withLock = <A, E>(key: string, effect: Effect.Effect<A, E>) =>
      Effect.acquireUseRelease(
        Effect.tryPromise({
          try: () => redlock.acquire([key], 30_000),
          catch: () =>
            new ResourceConflictError({ code: "HERO_SIGHTING_RACE_CONDITION" }),
        }),
        () => effect,
        (lock: Awaited<ReturnType<typeof redlock.acquire>>) =>
          Effect.tryPromise(() => lock.release()).pipe(Effect.ignore),
      );

    const publish = makeHeroSightingPublisher(rabbit);

    return Layer.succeed(
      HeroSightingsData,
      HeroSightingsData.of({
        create: makeCreateHeroSighting(database, { publish, withLock }),
        ...makeHeroSightingReads(database),
        ...makeHeroSightingClaims(database, { publish }),
      }),
    );
  }),
);
